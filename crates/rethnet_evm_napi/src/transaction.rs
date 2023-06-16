mod pending;
mod request;
pub mod result;
pub mod signed;

use napi_derive::napi;

pub use self::{pending::PendingTransaction, request::TransactionRequest};

#[napi(object)]
pub struct TransactionConfig {
    pub disable_balance_check: Option<bool>,
}
