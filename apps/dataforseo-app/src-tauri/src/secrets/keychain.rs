use crate::errors::Result;

const SERVICE: &str = "dataforseo-app";

#[derive(Clone, Debug)]
pub struct Credentials {
    pub login: String,
    pub password: String,
}

pub fn save(login: &str, password: &str) -> Result<()> {
    keyring::Entry::new(SERVICE, "login")?.set_password(login)?;
    keyring::Entry::new(SERVICE, "password")?.set_password(password)?;
    Ok(())
}

pub fn load() -> Result<Option<Credentials>> {
    let login = match keyring::Entry::new(SERVICE, "login")?.get_password() {
        Ok(v) => v,
        Err(keyring::Error::NoEntry) => return Ok(None),
        Err(e) => return Err(e.into()),
    };
    let password = keyring::Entry::new(SERVICE, "password")?.get_password()?;
    Ok(Some(Credentials { login, password }))
}

pub fn clear() -> Result<()> {
    let _ = keyring::Entry::new(SERVICE, "login")?.delete_credential();
    let _ = keyring::Entry::new(SERVICE, "password")?.delete_credential();
    Ok(())
}

/// Generic provider-key storage for AI providers (Anthropic, OpenAI, ...).
/// Each provider stores under its own keychain entry name.
pub fn save_ai_key(provider: &str, key: &str) -> Result<()> {
    keyring::Entry::new(SERVICE, &ai_entry(provider))?.set_password(key)?;
    Ok(())
}

pub fn load_ai_key(provider: &str) -> Result<Option<String>> {
    match keyring::Entry::new(SERVICE, &ai_entry(provider))?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn clear_ai_key(provider: &str) -> Result<()> {
    let _ = keyring::Entry::new(SERVICE, &ai_entry(provider))?.delete_credential();
    Ok(())
}

fn ai_entry(provider: &str) -> String {
    format!("ai.{provider}.api_key")
}
