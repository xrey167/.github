//! Token-bucket per endpoint family.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use tokio::sync::Mutex;

/// Floor on the sleep duration when the bucket reports we should wait.
/// A computed sub-millisecond wait combined with clock granularity can
/// cause acquire() to spin without ever crossing the 1-token threshold.
const MIN_WAIT: Duration = Duration::from_millis(1);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Family {
    GoogleAdsLive,
    KeywordsData,
    Labs,
    SerpLive,
    SerpTask,
    Backlinks,
    DomainAnalytics,
    OnPage,
}

struct Bucket {
    capacity: f64,
    tokens: f64,
    refill_per_sec: f64,
    last_refill: Instant,
}

impl Bucket {
    fn new(capacity: f64, refill_per_sec: f64) -> Self {
        Self { capacity, tokens: capacity, refill_per_sec, last_refill: Instant::now() }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.tokens = (self.tokens + elapsed * self.refill_per_sec).min(self.capacity);
        self.last_refill = now;
    }

    fn try_take(&mut self) -> Option<Duration> {
        self.refill();
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            None
        } else {
            let needed = 1.0 - self.tokens;
            let wait_secs = needed / self.refill_per_sec;
            Some(Duration::from_secs_f64(wait_secs).max(MIN_WAIT))
        }
    }
}

pub struct Scheduler {
    buckets: Mutex<HashMap<Family, Bucket>>,
}

impl Scheduler {
    pub fn new() -> Self {
        let mut buckets = HashMap::new();
        // capacity = burst allowed, refill_per_sec = sustained rate.
        buckets.insert(Family::GoogleAdsLive, Bucket::new(12.0, 12.0 / 60.0));
        // KeywordsData (trends explore, clickstream, bing) shares the
        // same 60-rpm bucket dynamics as the Labs family.
        buckets.insert(Family::KeywordsData, Bucket::new(60.0, 10.0));
        buckets.insert(Family::Labs, Bucket::new(60.0, 10.0));
        buckets.insert(Family::SerpLive, Bucket::new(120.0, 20.0));
        buckets.insert(Family::SerpTask, Bucket::new(2000.0, 2000.0 / 60.0));
        // Backlinks: 2000 rpm sustained, but the API enforces a separate
        // 30-simultaneous-request cap that we'd want to honour if we ever
        // fan out parallel calls. For Phase 2 we keep it simple — same
        // capacity model as SerpTask, the per-family Semaphore will be
        // added if we add parallel calls later.
        buckets.insert(Family::Backlinks, Bucket::new(2000.0, 2000.0 / 60.0));
        // Domain Analytics (whois, technologies): 2000 rpm in DataForSEO's
        // documented limits. Same capacity model as Backlinks; UI calls
        // are one-at-a-time so the burst capacity is more than enough.
        buckets.insert(Family::DomainAnalytics, Bucket::new(2000.0, 2000.0 / 60.0));
        // OnPage instant_pages + lighthouse — DataForSEO documents 2000 rpm
        // for the on_page family. Capacity matches the other 2k families.
        buckets.insert(Family::OnPage, Bucket::new(2000.0, 2000.0 / 60.0));
        Self { buckets: Mutex::new(buckets) }
    }

    pub async fn acquire(&self, family: Family) {
        loop {
            let wait = {
                let mut buckets = self.buckets.lock().await;
                let bucket = buckets.get_mut(&family).expect("bucket configured for every family");
                bucket.try_take()
            };
            match wait {
                None => return,
                Some(d) => tokio::time::sleep(d).await,
            }
        }
    }
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(flavor = "current_thread", start_paused = true)]
    async fn first_burst_fits_capacity() {
        let s = Scheduler::new();
        for _ in 0..12 {
            s.acquire(Family::GoogleAdsLive).await;
        }
    }

    #[tokio::test(flavor = "current_thread", start_paused = true)]
    async fn thirteenth_request_waits_for_refill() {
        let s = Scheduler::new();
        let start = tokio::time::Instant::now();
        for _ in 0..13 {
            s.acquire(Family::GoogleAdsLive).await;
        }
        let elapsed = tokio::time::Instant::now() - start;
        assert!(elapsed >= Duration::from_secs(4));
    }
}
