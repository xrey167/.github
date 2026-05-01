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
