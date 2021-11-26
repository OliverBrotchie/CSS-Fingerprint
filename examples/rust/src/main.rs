#[macro_use]
extern crate dotenv_codegen;
use actix_web::{get, web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tokio::time::{sleep, Duration};
use tokio_postgres::NoTls;

#[derive(Serialize, Debug, Clone)]
pub struct Fingerprint {
    properties: Vec<(String, String)>,
    fonts: Vec<String>,
    headers: Vec<(String, String)>,
    timestamp: i64,
}

impl Fingerprint {
    fn insert(&mut self, (key, value): (String, String)) {
        if key == "font-name" {
            self.fonts.push(value)
        } else {
            self.properties.push((key, value))
        }
    }
}

#[derive(Clone)]
struct Fingerprints {
    data: Arc<Mutex<HashMap<String, Fingerprint>>>,
}

impl Fingerprints {
    pub fn take_by_ip(&self, ip: &str) -> Option<Fingerprint> {
        self.data.lock().unwrap().remove(ip)
    }

    pub fn with_lock<F, T>(&self, func: F) -> T
    where
        F: FnOnce(&mut HashMap<String, Fingerprint>) -> T,
    {
        let mut lock = self.data.lock().unwrap();
        func(&mut *lock)
    }
}

const URL: &str = dotenv!("DATABASE_URL");
const PORT: u16 = 8000;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 Server running on port: {}!", PORT);
    let data = web::Data::new(Fingerprints {
        data: Arc::new(Mutex::new(HashMap::new())),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(data.clone())
            .service(new_visitor)
            .service(new_prop)
    })
    .bind(format!("127.0.0.1:{}", PORT))?
    .run()
    .await
}

async fn export_data(ip: &str, fingerprint: Fingerprint) {
    println!("ip: {}, fingerprint: {:#?}", ip, fingerprint.properties);

    match tokio_postgres::connect(&URL, NoTls).await {
        Ok((client, connection)) => {
            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("connection error: {}", e);
                }
            });
            client
                .execute(
                    "INSERT INTO fingerprints (ip, fingerprint) VALUES ($1,$2);",
                    &[&ip, &serde_json::to_value(fingerprint).unwrap()],
                )
                .await
                .unwrap();
        }
        Err(e) => {
            println!("Error: {}", e)
        }
    }
}

/// Handle Standard Properties
#[get("/some/url/{key}={value}")]
async fn new_prop(
    fingerprints: web::Data<Fingerprints>,
    request: HttpRequest,
    pair: web::Path<(String, String)>,
) -> impl Responder {
    // Determine response type
    let response = if pair.0 == "308" {
        HttpResponse::BadRequest()
    } else {
        // Stops browser from re-requesting properties on reload
        HttpResponse::Gone()
    };

    let fingerprints = fingerprints.into_inner();
    let ip: String = (*request
        .connection_info()
        .realip_remote_addr()
        .unwrap()
        .split(':')
        .next()
        .unwrap())
    .to_string();

    // Create new Fingerprint or add prop to existing
    if fingerprints.with_lock(|map| match map.get_mut(&ip) {
        None => {
            let mut f = Fingerprint {
                properties: Vec::new(),
                fonts: Vec::new(),
                headers: request
                    .headers()
                    .iter()
                    .map(|(key, value)| {
                        (
                            key.as_str().to_owned(),
                            value.to_str().unwrap_or("opaque").to_owned(),
                        )
                    })
                    .collect(),
                timestamp: chrono::offset::Utc::now().timestamp(),
            };
            f.insert(pair.into_inner());
            map.insert(ip.to_owned(), f);
            true
        }
        Some(f) => {
            f.insert(pair.into_inner());
            false
        }
    }) {
        // Wait 10 seconds before exporting to DB
        tokio::spawn(async move {
            sleep(Duration::from_millis(10000)).await;
            export_data(&ip, fingerprints.take_by_ip(&ip).unwrap()).await;
        });
    };

    response
}

/// Permenant Redirect Cookie
#[get("/some/url/308")]
async fn new_visitor() -> impl Responder {
    HttpResponse::PermanentRedirect()
        .append_header((
            "location",
            format!(
                "/some/url/308={}",
                // Generate unique address to redirect to
                random_string::generate(16, "0123456789ABCDEF")
            ),
        ))
        .finish()
}
