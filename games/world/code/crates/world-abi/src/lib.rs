//! M2 adapter ABI：只声明 C ABI，不依赖 world-core。
//! 适配器 crate 应只 use 本 crate 的类型/函数；实现由 world-ffi 链接提供。

use std::ffi::{c_char, CStr, CString};
use std::ptr;

#[cfg(feature = "link-world-ffi")]
#[allow(unused_imports)]
pub use world_ffi as _;

pub const WORLD_OK: i32 = 0;
pub const WORLD_ERR_BUFFER_TOO_SMALL: i32 = 1;
pub const WORLD_ABI_MAJOR: u32 = 1;
pub const WORLD_ABI_MINOR: u32 = 0;
pub const WORLD_ABI_VERSION: u32 = (WORLD_ABI_MAJOR << 16) | WORLD_ABI_MINOR;
pub const WORLD_ENTITY_NONE: u64 = u64::MAX;

#[repr(C)]
pub struct WorldHandle {
    _private: [u8; 0],
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct WorldTransformPod {
    pub index: u32,
    pub generation: u32,
    pub position: [f32; 3],
    pub rotation: [f32; 4],
    pub scale: [f32; 3],
    pub flags: u32,
}

#[repr(C)]
pub struct WorldConfig {
    pub abi_version: u32,
    pub struct_size: u32,
    pub user_data_dir: *const c_char,
    pub locale: *const c_char,
    pub flags: u32,
}

extern "C" {
    fn world_create(config: *const WorldConfig) -> *mut WorldHandle;
    fn world_destroy(world: *mut WorldHandle);
    fn world_load_pack(world: *mut WorldHandle, bytes: *const u8, len: usize) -> i32;
    fn world_tick(world: *mut WorldHandle, frame_dt_us: u64, out_ticks: *mut u32) -> i32;
    fn world_poll_events(
        world: *mut WorldHandle,
        out: *mut u8,
        cap: usize,
        out_len: *mut usize,
    ) -> i32;
    fn world_state_hash(world: *mut WorldHandle) -> u64;
    fn world_command(
        world: *mut WorldHandle,
        bytes: *const u8,
        len: usize,
        out: *mut u8,
        cap: usize,
        out_len: *mut usize,
    ) -> i32;
    fn world_find_entity(world: *mut WorldHandle, content_id: *const c_char) -> u64;
    fn world_copy_transforms(
        world: *mut WorldHandle,
        out: *mut WorldTransformPod,
        cap: usize,
    ) -> usize;
    fn world_save(world: *mut WorldHandle, out: *mut u8, cap: usize, out_len: *mut usize) -> i32;
    fn world_load_save(world: *mut WorldHandle, bytes: *const u8, len: usize) -> i32;
    fn world_last_error(world: *mut WorldHandle) -> *const c_char;
}

/// 适配器侧的最小安全包装；不暴露 world-core 类型。
pub struct AbiWorld {
    handle: *mut WorldHandle,
}

impl AbiWorld {
    pub fn new() -> Result<Self, String> {
        let locale = CString::new("zh-CN").unwrap();
        let config = WorldConfig {
            abi_version: WORLD_ABI_VERSION,
            struct_size: std::mem::size_of::<WorldConfig>() as u32,
            user_data_dir: ptr::null(),
            locale: locale.as_ptr(),
            flags: 0,
        };
        let handle = unsafe { world_create(&config) };
        if handle.is_null() {
            return Err(last_error(ptr::null_mut()));
        }
        Ok(Self { handle })
    }

    pub fn load_pack(&mut self, bytes: &[u8]) -> Result<(), String> {
        let status = unsafe { world_load_pack(self.handle, bytes.as_ptr(), bytes.len()) };
        if status == WORLD_OK {
            Ok(())
        } else {
            Err(last_error(self.handle))
        }
    }

    pub fn tick(&mut self, frame_dt_us: u64) -> Result<u32, String> {
        let mut ticks = 0;
        let status = unsafe { world_tick(self.handle, frame_dt_us, &mut ticks) };
        if status == WORLD_OK {
            Ok(ticks)
        } else {
            Err(last_error(self.handle))
        }
    }

    pub fn poll_events(&mut self) -> Result<String, String> {
        let mut len = 0usize;
        let status = unsafe { world_poll_events(self.handle, ptr::null_mut(), 0, &mut len) };
        if status != WORLD_ERR_BUFFER_TOO_SMALL {
            return Err(last_error(self.handle));
        }
        let mut buf = vec![0u8; len];
        let status =
            unsafe { world_poll_events(self.handle, buf.as_mut_ptr(), buf.len(), &mut len) };
        if status != WORLD_OK {
            return Err(last_error(self.handle));
        }
        buf.truncate(len);
        String::from_utf8(buf).map_err(|e| format!("事件不是 UTF-8: {e}"))
    }

    pub fn state_hash(&self) -> u64 {
        unsafe { world_state_hash(self.handle) }
    }

    pub fn command(&mut self, json: &str) -> Result<(), String> {
        let mut len = 0usize;
        let bytes = json.as_bytes();
        let status = unsafe {
            world_command(
                self.handle,
                bytes.as_ptr(),
                bytes.len(),
                ptr::null_mut(),
                0,
                &mut len,
            )
        };
        if status == WORLD_OK {
            Ok(())
        } else {
            Err(last_error(self.handle))
        }
    }

    pub fn find_entity(&self, content_id: &str) -> Option<u64> {
        let c = CString::new(content_id).ok()?;
        let id = unsafe { world_find_entity(self.handle, c.as_ptr()) };
        (id != WORLD_ENTITY_NONE).then_some(id)
    }

    pub fn copy_transforms(&mut self) -> Result<Vec<WorldTransformPod>, String> {
        let required = unsafe { world_copy_transforms(self.handle, ptr::null_mut(), 0) };
        if required == 0 {
            return Ok(Vec::new());
        }
        let mut out = vec![WorldTransformPod::default(); required];
        let copied = unsafe { world_copy_transforms(self.handle, out.as_mut_ptr(), out.len()) };
        if copied != required {
            return Err(format!(
                "world_copy_transforms: expected {required}, got {copied}"
            ));
        }
        Ok(out)
    }

    pub fn save(&mut self) -> Result<Vec<u8>, String> {
        let mut len = 0usize;
        let status = unsafe { world_save(self.handle, ptr::null_mut(), 0, &mut len) };
        if status != WORLD_ERR_BUFFER_TOO_SMALL {
            return Err(last_error(self.handle));
        }
        let mut buf = vec![0u8; len];
        let status = unsafe { world_save(self.handle, buf.as_mut_ptr(), buf.len(), &mut len) };
        if status != WORLD_OK {
            return Err(last_error(self.handle));
        }
        buf.truncate(len);
        Ok(buf)
    }

    pub fn load_save(&mut self, bytes: &[u8]) -> Result<(), String> {
        let status = unsafe { world_load_save(self.handle, bytes.as_ptr(), bytes.len()) };
        if status == WORLD_OK {
            Ok(())
        } else {
            Err(last_error(self.handle))
        }
    }
}

impl Drop for AbiWorld {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            unsafe { world_destroy(self.handle) };
        }
    }
}

fn last_error(world: *mut WorldHandle) -> String {
    let ptr = unsafe { world_last_error(world) };
    if ptr.is_null() {
        return "world ABI error".to_string();
    }
    unsafe { CStr::from_ptr(ptr) }
        .to_string_lossy()
        .into_owned()
}
