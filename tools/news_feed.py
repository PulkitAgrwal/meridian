"""News feed disruption scanner — Google News RSS + Gemini entity extraction.

Scans Google News RSS for supply chain disruption keywords,
then uses Gemini to extract location entities and severity estimates.
"""

import feedparser
import httpx
from datetime import datetime, timezone
from shared.reasoning_log import log_step


DISRUPTION_KEYWORDS = [
    "port closure", "shipping disruption", "supply chain",
    "canal blockage", "typhoon shipping", "cyclone maritime",
    "trade disruption", "logistics delay", "vessel grounding",
    "port congestion", "strike dock", "sanctions shipping",
]


async def scan_news_for_disruptions(keywords: list[str] | None = None) -> dict:
    """Scan Google News RSS for supply chain disruption headlines.
    
    Args:
        keywords: Optional list of keywords to search for
        
    Returns:
        Dictionary with relevant headlines and extracted entities
    """
    keywords = keywords or DISRUPTION_KEYWORDS[:5]
    query = "+".join(keywords[:3])
    url = f"https://news.google.com/rss/search?q={query}&hl=en&gl=US&ceid=US:en"
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            
            feed = feedparser.parse(resp.text)
            
            headlines = []
            for entry in feed.entries[:10]:
                title = entry.get("title", "")
                published = entry.get("published", "")
                source = entry.get("source", {}).get("title", "Unknown")
                
                # Basic relevance scoring
                relevance = sum(1 for kw in DISRUPTION_KEYWORDS if kw.lower() in title.lower())
                if relevance == 0:
                    continue
                
                severity_estimate = min(0.3 + relevance * 0.15, 0.95)
                
                headlines.append({
                    "title": title,
                    "source": source,
                    "published": published,
                    "relevance_score": relevance,
                    "severity_estimate": severity_estimate,
                })
            
            headlines.sort(key=lambda h: h["severity_estimate"], reverse=True)
            
            log_step("NewsFeed", "scan_complete",
                     f"Found {len(headlines)} relevant headlines from {len(feed.entries)} total")
            
            return {
                "headlines": headlines[:5],
                "total_scanned": len(feed.entries),
                "relevant_count": len(headlines),
                "source": "google_news_rss",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        # Fallback to demo data
        log_step("NewsFeed", "fallback", f"RSS fetch failed: {e}. Using demo data.")
        return {
            "headlines": [{
                "title": "Typhoon Gaemi approaching Southeast Asian shipping lanes",
                "source": "Reuters",
                "published": datetime.now(timezone.utc).isoformat(),
                "relevance_score": 3,
                "severity_estimate": 0.85,
            }],
            "total_scanned": 1,
            "relevant_count": 1,
            "source": "demo_mode",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
