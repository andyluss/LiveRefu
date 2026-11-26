//! QuickJS wasm 冒烟：导出无参数函数，Node 直接调用，证明 QuickJS 能在
//! wasm32-unknown-unknown 内实例化并执行一条规则条件。

static mut ERROR_BUF: [u8; 512] = [0; 512];
static mut ERROR_LEN: usize = 0;

fn set_error(message: &str) {
    let bytes = message.as_bytes();
    let len = bytes.len().min(511);
    unsafe {
        let buf = &mut *std::ptr::addr_of_mut!(ERROR_BUF);
        buf[..len].copy_from_slice(&bytes[..len]);
        buf[len] = 0;
        std::ptr::write(std::ptr::addr_of_mut!(ERROR_LEN), len);
    }
}

#[no_mangle]
pub extern "C" fn quickjs_eval_rule() -> i32 {
    match world_script::eval_bool("(1 + 1 === 2) && ('keycard' === 'keycard')") {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(error) => {
            set_error(&error);
            -1
        }
    }
}

#[no_mangle]
pub extern "C" fn quickjs_error_ptr() -> *const u8 {
    std::ptr::addr_of!(ERROR_BUF) as *const u8
}

#[no_mangle]
pub extern "C" fn quickjs_error_len() -> usize {
    unsafe { std::ptr::read(std::ptr::addr_of!(ERROR_LEN)) }
}
