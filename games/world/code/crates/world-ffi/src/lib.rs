#![allow(clippy::not_unsafe_ptr_arg_deref)]
// C ABI 的指针有效性由调用方保证；函数内部用 catch_unwind 隔离 panic。

use std::ffi::{c_char, CStr, CString};
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::ptr;
use world_core::{Command, EntityId, World};
use world_pack::Pack;
use world_script::attach_script_host;

pub const WORLD_OK: i32 = 0;
pub const WORLD_ERR_BUFFER_TOO_SMALL: i32 = 1;
pub const WORLD_ERR_INVALID_ARG: i32 = 2;
pub const WORLD_ERR_PACK: i32 = 3;
pub const WORLD_ERR_SAVE: i32 = 4;
pub const WORLD_ERR_PANIC: i32 = 5;
pub const WORLD_ERR_VERSION: i32 = 6;
pub const WORLD_ERR_STATE: i32 = 7;
pub const WORLD_ERR_UNSUPPORTED: i32 = 8;
pub const WORLD_ERR_INTERNAL: i32 = 9;

pub const WORLD_ABI_MAJOR: u32 = 1;
pub const WORLD_ABI_MINOR: u32 = 0;
pub const WORLD_ABI_VERSION: u32 = (WORLD_ABI_MAJOR << 16) | WORLD_ABI_MINOR;
pub const WORLD_ENTITY_NONE: u64 = u64::MAX;

#[repr(C)]
pub struct WorldConfig {
    pub abi_version: u32,
    pub struct_size: u32,
    pub user_data_dir: *const c_char,
    pub locale: *const c_char,
    pub flags: u32,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct WorldTransformPod {
    pub index: u32,
    pub generation: u32,
    pub position: [f32; 3],
    pub rotation: [f32; 4],
    pub scale: [f32; 3],
    pub flags: u32,
}

pub struct WorldHandle {
    world: Option<World>,
    pack: Option<Pack>,
    last_error: CString,
}

thread_local! {
    static GLOBAL_ERROR: std::cell::RefCell<CString> =
        std::cell::RefCell::new(CString::new("").unwrap());
}

fn set_global_error(message: impl Into<String>) {
    let text = message.into().replace('\0', " ");
    let cstring = CString::new(text).unwrap_or_else(|_| CString::new("error").unwrap());
    GLOBAL_ERROR.with(|cell| {
        *cell.borrow_mut() = cstring;
    });
}

fn set_error(handle: &mut WorldHandle, message: impl Into<String>) {
    let text = message.into().replace('\0', " ");
    handle.last_error = CString::new(text).unwrap_or_else(|_| CString::new("error").unwrap());
}

fn status_ok() -> i32 {
    WORLD_OK
}

fn with_world_mut<F>(handle: *mut WorldHandle, f: F) -> i32
where
    F: FnOnce(&mut WorldHandle) -> Result<i32, (i32, String)>,
{
    if handle.is_null() {
        set_global_error("WorldHandle 为空");
        return WORLD_ERR_INVALID_ARG;
    }
    let result = catch_unwind(AssertUnwindSafe(|| {
        let handle = unsafe { &mut *handle };
        f(handle)
    }));
    match result {
        Ok(Ok(code)) => code,
        Ok(Err((code, message))) => {
            if let Ok(handle) = catch_unwind(AssertUnwindSafe(|| unsafe { &mut *handle })) {
                set_error(handle, message);
            }
            code
        }
        Err(_) => {
            if let Ok(handle) = catch_unwind(AssertUnwindSafe(|| unsafe { &mut *handle })) {
                set_error(handle, "内核 panic 已被 ABI 边界捕获");
            }
            WORLD_ERR_PANIC
        }
    }
}

fn cstr(ptr: *const c_char) -> Result<String, (i32, String)> {
    if ptr.is_null() {
        return Err((WORLD_ERR_INVALID_ARG, "字符串指针为空".to_string()));
    }
    unsafe { CStr::from_ptr(ptr) }
        .to_str()
        .map(|s| s.to_string())
        .map_err(|_| (WORLD_ERR_INVALID_ARG, "字符串不是 UTF-8".to_string()))
}

fn bytes_from(ptr: *const u8, len: usize) -> Result<&'static [u8], (i32, String)> {
    if len == 0 {
        return Ok(&[]);
    }
    if ptr.is_null() {
        return Err((WORLD_ERR_INVALID_ARG, "字节指针为空".to_string()));
    }
    Ok(unsafe { std::slice::from_raw_parts(ptr, len) })
}

#[no_mangle]
pub extern "C" fn world_core_version() -> *const c_char {
    static VERSION: &[u8] = b"0.1.0\0";
    VERSION.as_ptr() as *const c_char
}

#[no_mangle]
pub extern "C" fn world_create(config: *const WorldConfig) -> *mut WorldHandle {
    let result = catch_unwind(AssertUnwindSafe(|| {
        if config.is_null() {
            set_global_error("WorldConfig 为空");
            return ptr::null_mut();
        }
        let config = unsafe { &*config };
        let major = config.abi_version >> 16;
        let minor = config.abi_version & 0xFFFF;
        if major != WORLD_ABI_MAJOR {
            set_global_error(format!(
                "ABI 主版本不匹配：调用方 {major}，内核 {WORLD_ABI_MAJOR}"
            ));
            return ptr::null_mut();
        }
        if minor > WORLD_ABI_MINOR {
            set_global_error(format!(
                "调用方 ABI minor {minor} 高于内核 {WORLD_ABI_MINOR}"
            ));
            return ptr::null_mut();
        }
        if config.struct_size < std::mem::size_of::<WorldConfig>() as u32 {
            set_global_error("WorldConfig.struct_size 过小");
            return ptr::null_mut();
        }
        Box::into_raw(Box::new(WorldHandle {
            world: None,
            pack: None,
            last_error: CString::new("").unwrap(),
        }))
    }));
    match result {
        Ok(handle) => handle,
        Err(_) => {
            set_global_error("world_create panic");
            ptr::null_mut()
        }
    }
}

#[no_mangle]
pub extern "C" fn world_destroy(handle: *mut WorldHandle) {
    if handle.is_null() {
        return;
    }
    let _ = catch_unwind(AssertUnwindSafe(|| unsafe {
        drop(Box::from_raw(handle));
    }));
}

#[no_mangle]
pub extern "C" fn world_load_pack(handle: *mut WorldHandle, bytes: *const u8, len: usize) -> i32 {
    with_world_mut(handle, |handle| {
        let bytes = bytes_from(bytes, len)?;
        let pack = Pack::from_bundle_bytes(bytes).map_err(|e| (WORLD_ERR_PACK, e.to_string()))?;
        let report = pack.validate();
        if !report.is_ok() {
            let message = report
                .errors
                .iter()
                .map(|e| e.to_string())
                .collect::<Vec<_>>()
                .join("; ");
            return Err((WORLD_ERR_PACK, message));
        }
        let hash = pack.hash().map_err(|e| (WORLD_ERR_PACK, e.to_string()))?;
        let mut world = World::from_pack(&pack, hash).map_err(|e| (WORLD_ERR_PACK, e))?;
        attach_script_host(&mut world, &pack).map_err(|e| (WORLD_ERR_PACK, e))?;
        handle.pack = Some(pack);
        handle.world = Some(world);
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_tick(
    handle: *mut WorldHandle,
    frame_dt_us: u64,
    out_ticks: *mut u32,
) -> i32 {
    with_world_mut(handle, |handle| {
        let world = handle
            .world
            .as_mut()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        let ticks = world.advance(frame_dt_us);
        if !out_ticks.is_null() {
            unsafe { *out_ticks = ticks };
        }
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_command(
    handle: *mut WorldHandle,
    bytes: *const u8,
    len: usize,
    out: *mut u8,
    cap: usize,
    out_len: *mut usize,
) -> i32 {
    with_world_mut(handle, |handle| {
        let bytes = bytes_from(bytes, len)?;
        let command: Command = serde_json::from_slice(bytes)
            .map_err(|e| (WORLD_ERR_INVALID_ARG, format!("命令解析失败: {e}")))?;
        let world = handle
            .world
            .as_mut()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        world.queue_command(command);
        if !out_len.is_null() {
            unsafe { *out_len = 0 };
        }
        if !out.is_null() && cap > 0 {
            // M0 命令结果为空；保留缓冲参数以便未来扩展。
        }
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_poll_events(
    handle: *mut WorldHandle,
    out: *mut u8,
    cap: usize,
    out_len: *mut usize,
) -> i32 {
    with_world_mut(handle, |handle| {
        let world = handle
            .world
            .as_mut()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        let text = world.events_json_lines();
        let bytes = text.as_bytes();
        if !out_len.is_null() {
            unsafe { *out_len = bytes.len() };
        }
        if bytes.is_empty() {
            world.drain_events();
            return Ok(status_ok());
        }
        if out.is_null() || cap < bytes.len() {
            return Ok(WORLD_ERR_BUFFER_TOO_SMALL);
        }
        unsafe { ptr::copy_nonoverlapping(bytes.as_ptr(), out, bytes.len()) };
        world.drain_events();
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_copy_transforms(
    handle: *mut WorldHandle,
    out: *mut WorldTransformPod,
    cap: usize,
) -> usize {
    if handle.is_null() {
        return 0;
    }
    let result = catch_unwind(AssertUnwindSafe(|| {
        let handle = unsafe { &mut *handle };
        let Some(world) = handle.world.as_ref() else {
            set_error(handle, "未加载内容包");
            return 0;
        };
        let entities: Vec<&world_core::Entity> = world.entities().collect();
        let required = entities.len();
        if out.is_null() || cap < required {
            return required;
        }
        for (i, entity) in entities.iter().enumerate() {
            let half = entity.transform.yaw * 0.5;
            let pod = WorldTransformPod {
                index: entity.id.index,
                generation: entity.id.generation,
                position: entity.transform.position,
                rotation: [0.0, half.sin(), 0.0, half.cos()],
                scale: [1.0, 1.0, 1.0],
                // flags 低 8 位：1=player, 2=actor, 3=prop, 4=item；供适配器选视图资源。
                flags: match entity.kind {
                    world_core::EntityKind::Player => 1,
                    world_core::EntityKind::Actor => 2,
                    world_core::EntityKind::Prop => 3,
                    world_core::EntityKind::Item => 4,
                },
            };
            unsafe { *out.add(i) = pod };
        }
        required
    }));
    match result {
        Ok(n) => n,
        Err(_) => {
            if let Ok(handle) = catch_unwind(AssertUnwindSafe(|| unsafe { &mut *handle })) {
                set_error(handle, "world_copy_transforms panic");
            }
            0
        }
    }
}

#[no_mangle]
pub extern "C" fn world_state_hash(handle: *mut WorldHandle) -> u64 {
    if handle.is_null() {
        return 0;
    }
    catch_unwind(AssertUnwindSafe(|| unsafe {
        (&*handle)
            .world
            .as_ref()
            .map(|w| w.state_hash())
            .unwrap_or(0)
    }))
    .unwrap_or(0)
}

#[no_mangle]
pub extern "C" fn world_find_entity(handle: *mut WorldHandle, content_id: *const c_char) -> u64 {
    if handle.is_null() || content_id.is_null() {
        return WORLD_ENTITY_NONE;
    }
    catch_unwind(AssertUnwindSafe(|| {
        let id = unsafe { CStr::from_ptr(content_id) }
            .to_str()
            .ok()
            .and_then(|s| {
                unsafe { (&*handle).world.as_ref() }.and_then(|w| w.find_by_content_id(s))
            });
        id.map(|id| id.pack()).unwrap_or(WORLD_ENTITY_NONE)
    }))
    .unwrap_or(WORLD_ENTITY_NONE)
}

#[no_mangle]
pub extern "C" fn world_save(
    handle: *mut WorldHandle,
    out: *mut u8,
    cap: usize,
    out_len: *mut usize,
) -> i32 {
    with_world_mut(handle, |handle| {
        let world = handle
            .world
            .as_ref()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        let bytes = world.save_bytes().map_err(|e| (WORLD_ERR_SAVE, e))?;
        if !out_len.is_null() {
            unsafe { *out_len = bytes.len() };
        }
        if out.is_null() || cap < bytes.len() {
            return Ok(WORLD_ERR_BUFFER_TOO_SMALL);
        }
        if !bytes.is_empty() {
            unsafe { ptr::copy_nonoverlapping(bytes.as_ptr(), out, bytes.len()) };
        }
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_load_save(handle: *mut WorldHandle, bytes: *const u8, len: usize) -> i32 {
    with_world_mut(handle, |handle| {
        let bytes = bytes_from(bytes, len)?;
        let pack = handle
            .pack
            .as_ref()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        let world = World::load_bytes(pack, bytes).map_err(|e| (WORLD_ERR_SAVE, e))?;
        handle.world = Some(world);
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_activate_zone(handle: *mut WorldHandle, zone_id: *const c_char) -> i32 {
    with_world_mut(handle, |handle| {
        let zone = cstr(zone_id)?;
        let world = handle
            .world
            .as_mut()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        world
            .apply_command(Command::ActivateZone { zone })
            .map_err(|e| (WORLD_ERR_INVALID_ARG, e))?;
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_deactivate_zone(handle: *mut WorldHandle, _zone_id: *const c_char) -> i32 {
    with_world_mut(handle, |_handle| Ok(WORLD_ERR_UNSUPPORTED))
}

#[no_mangle]
pub extern "C" fn world_zone_assets(
    handle: *mut WorldHandle,
    zone_id: *const c_char,
    out: *mut u8,
    cap: usize,
    out_len: *mut usize,
) -> i32 {
    with_world_mut(handle, |handle| {
        let zone = cstr(zone_id)?;
        let assets = handle
            .pack
            .as_ref()
            .map(|pack| pack.zone_assets(&zone))
            .unwrap_or_default();
        let text = serde_json::to_vec(&assets)
            .map_err(|e| (WORLD_ERR_INTERNAL, format!("资产序列化失败: {e}")))?;
        if !out_len.is_null() {
            unsafe { *out_len = text.len() };
        }
        if out.is_null() || cap < text.len() {
            return Ok(WORLD_ERR_BUFFER_TOO_SMALL);
        }
        unsafe { ptr::copy_nonoverlapping(text.as_ptr(), out, text.len()) };
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_entity_visual_source(
    handle: *mut WorldHandle,
    index: u32,
    generation: u32,
    out: *mut u8,
    cap: usize,
    out_len: *mut usize,
) -> i32 {
    with_world_mut(handle, |handle| {
        let world = handle
            .world
            .as_ref()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        let entity = world
            .entity(world_core::EntityId::new(index, generation))
            .ok_or((
                WORLD_ERR_INVALID_ARG,
                format!("实体不存在: {index}:{generation}"),
            ))?;
        let pack = handle
            .pack
            .as_ref()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        let visual = match entity.kind {
            world_core::EntityKind::Player | world_core::EntityKind::Actor => pack
                .actors
                .get(&entity.content_id)
                .and_then(|d| d.visual.clone()),
            world_core::EntityKind::Prop => pack
                .props
                .get(&entity.content_id)
                .and_then(|d| d.visual.clone()),
            world_core::EntityKind::Item => pack
                .items
                .get(&entity.content_id)
                .and_then(|d| d.visual.clone()),
        };
        let source = visual
            .and_then(|id| pack.assets.get(&id).map(|a| a.source.clone()))
            .unwrap_or_default();
        let bytes = source.as_bytes();
        if !out_len.is_null() {
            unsafe { *out_len = bytes.len() };
        }
        if out.is_null() || cap < bytes.len() {
            return Ok(WORLD_ERR_BUFFER_TOO_SMALL);
        }
        unsafe { ptr::copy_nonoverlapping(bytes.as_ptr(), out, bytes.len()) };
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_zone_status(handle: *mut WorldHandle, zone_id: *const c_char) -> i32 {
    if handle.is_null() || zone_id.is_null() {
        return 0;
    }
    catch_unwind(AssertUnwindSafe(|| {
        let zone = match unsafe { CStr::from_ptr(zone_id) }.to_str() {
            Ok(s) => s,
            Err(_) => return 0,
        };
        let handle = unsafe { &*handle };
        let Some(pack) = &handle.pack else {
            return 0;
        };
        if pack.zones.contains_key(zone) {
            3
        } else {
            0
        }
    }))
    .unwrap_or(0)
}

#[no_mangle]
pub extern "C" fn world_set_zone_visible(
    handle: *mut WorldHandle,
    _zone_id: *const c_char,
    _visible: i32,
) -> i32 {
    with_world_mut(handle, |_handle| Ok(status_ok()))
}

#[no_mangle]
pub extern "C" fn world_suspend(handle: *mut WorldHandle, suspended: i32) -> i32 {
    with_world_mut(handle, |handle| {
        let world = handle
            .world
            .as_mut()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        world.suspended = suspended != 0;
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_set_timescale(handle: *mut WorldHandle, scale: f32) -> i32 {
    with_world_mut(handle, |handle| {
        if !scale.is_finite() || scale <= 0.0 {
            return Err((
                WORLD_ERR_INVALID_ARG,
                "timescale 必须是正有限数".to_string(),
            ));
        }
        let world = handle
            .world
            .as_mut()
            .ok_or((WORLD_ERR_STATE, "未加载内容包".to_string()))?;
        world.timescale = scale as f64;
        Ok(status_ok())
    })
}

#[no_mangle]
pub extern "C" fn world_last_error(handle: *mut WorldHandle) -> *const c_char {
    if handle.is_null() {
        return GLOBAL_ERROR.with(|cell| cell.borrow().as_ptr());
    }
    catch_unwind(AssertUnwindSafe(|| unsafe {
        (&*handle).last_error.as_ptr()
    }))
    .unwrap_or(ptr::null())
}

#[allow(dead_code)]
fn entity_none() -> EntityId {
    EntityId::NONE
}
