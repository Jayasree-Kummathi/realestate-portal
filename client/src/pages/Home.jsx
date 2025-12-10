// client/src/pages/Home.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";


export default function Home() {
  const [properties, setProperties] = useState([]);
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("All");
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [type, setType] = useState("");
  const [listingType, setListingType] = useState("");
  const [budget, setBudget] = useState("");
  const [keyword, setKeyword] = useState("");
  const [services, setServices] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularLocalities, setPopularLocalities] = useState([]);
  const [nearbyLocalities, setNearbyLocalities] = useState([]);
  const suggestTimer = useRef(null);
  
  const slideImages = [
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1612637968894-660373e23b03?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1475855581690-80accde3ae2b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80"
];
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideIntervalRef = useRef(null);
  const parallaxRef = useRef(0);
  const servicesSliderRef = useRef(null);
  const servicesIntervalRef = useRef(null);

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  /* ------------------ initial load ------------------ */
  useEffect(() => {
    loadProperties();
    loadCities();
    loadServices();
  }, []);

  useEffect(() => {
    startSlideRotation();
    
    const onScroll = () => {
      parallaxRef.current = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    let rafId = null;
    const renderParallax = () => {
      const root = document.documentElement;
      root.style.setProperty("--hero-scroll-y", `${parallaxRef.current}`);
      rafId = requestAnimationFrame(renderParallax);
    };
    rafId = requestAnimationFrame(renderParallax);

    return () => {
      stopSlideRotation();
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  /* ------------------ Services Auto Scroll ------------------ */
  useEffect(() => {
    if (!services.length) return;

    const startAutoScroll = () => {
      servicesIntervalRef.current = setInterval(() => {
        if (servicesSliderRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = servicesSliderRef.current;
          
          // If reached the end, reset to start
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            servicesSliderRef.current.scrollTo({
              left: 0,
              behavior: "instant"
            });
          } else {
            servicesSliderRef.current.scrollBy({
              left: 1,
              behavior: "auto"
            });
          }
        }
      }, 20);
    };

    startAutoScroll();

    return () => {
      if (servicesIntervalRef.current) {
        clearInterval(servicesIntervalRef.current);
        servicesIntervalRef.current = null;
      }
    };
  }, [services]);

  const startSlideRotation = () => {
    stopSlideRotation();
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % slideImages.length);
    }, 4500);
  };

  const stopSlideRotation = () => {
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
  };

  const loadProperties = async () => {
    try {
      const res = await api.get("/properties");
      setProperties(res.data || []);
      computePopularLocalities(res.data || []);
    } catch (err) {
      console.error("Failed to load properties", err);
      setProperties([]);
    }
  };

  const loadCities = async () => {
    try {
      const res = await api.get("/properties/filters/cities");
      setCities(res.data || []);
    } catch (err) {
      console.error("Failed to load cities", err);
      setCities([]);
    }
  };

  // In Home.jsx, change the loadServices function:
const loadServices = async () => {
  try {
    // Use the existing company-banners endpoint
    const res = await api.get("/company-banners");
    const sorted = (res.data || []).sort((a, b) => a.priority - b.priority);
    
    // Transform the data to match the expected structure
    const transformedServices = sorted.map(banner => ({
      _id: banner._id,
      companyName: banner.companyName,
      serviceType: banner.serviceCategory || "Service",
      description: banner.description || banner.tagline || `${banner.companyName} - ${banner.serviceCategory || 'Real Estate Service'}`,
      servicesOffered: banner.services ? banner.services.join(", ") : banner.serviceCategory,
      contact: banner.phone || "Contact for details",
      image: banner.image ? `${BASE_URL}${banner.image}` : "https://via.placeholder.com/300x200?text=Company+Image",
      // Add additional fields if needed
      serviceCategory: banner.serviceCategory,
      operatingCities: banner.operatingCities
    }));
    
    setServices(transformedServices);
  } catch (err) {
    console.error("Failed to load company banners, using mock data", err);
    
    // Fallback to mock data
    const mockServices = [
      {
        _id: "1",
        companyName: "Skyline Builders",
        serviceType: "Construction",
        description: "Leading construction company with 20+ years experience",
        servicesOffered: "Construction, Renovation, Planning",
        contact: "+91 9876543210",
        image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=600&q=80"
      },
      // ... other mock services
    ];
    
    setServices(mockServices);
  }
};
  useEffect(() => {
    if (city === "All") {
      setAreas([]);
      setArea("All");
    } else {
      loadAreasByCity(city);
    }
  }, [city]);

  const loadAreasByCity = async (selectedCity) => {
    try {
      const res = await api.get("/properties/filters/areas", {
        params: { city: selectedCity },
      });
      setAreas(res.data || []);
    } catch (err) {
      console.error("Failed to load areas for", selectedCity, err);
      setAreas([]);
    }
  };

  const computePopularLocalities = (props) => {
    const map = {};
    const cityCount = {};
    (props || []).forEach((p) => {
      const c = (p.city || "").trim();
      const a = (p.areaName || "").trim();
      if (c && a) {
        const key = `${c}|||${a}`;
        map[key] = (map[key] || 0) + 1;
        cityCount[c] = (cityCount[c] || 0) + 1;
      }
    });

    const entries = Object.entries(map).map(([k, v]) => {
      const [c, a] = k.split("|||");
      return { city: c, area: a, count: v };
    });

    entries.sort((x, y) => y.count - x.count);
    setPopularLocalities(entries.slice(0, 20));
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        computeNearbyLocalities(latitude, longitude);
      },
      (err) => {},
      { maximumAge: 1000 * 60 * 60, timeout: 5000 }
    );
  }, [properties]);

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const computeNearbyLocalities = (lat, lng) => {
    const list = [];
    properties.forEach((p) => {
      const loc = p.location;
      if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
        const [lngP, latP] = loc.coordinates;
        if (latP && lngP) {
          const dist = haversineKm(lat, lng, latP, lngP);
          list.push({
            city: p.city || "Unknown",
            area: p.areaName || p.title || "Unknown",
            distanceKm: dist,
          });
        }
      }
    });

    list.sort((a, b) => a.distanceKm - b.distanceKm);
    const unique = [];
    const seen = new Set();
    for (const it of list) {
      const key = `${it.city}|||${it.area}`;
      if (!seen.has(key)) {
        unique.push(it);
        seen.add(key);
      }
      if (unique.length >= 8) break;
    }
    setNearbyLocalities(unique);
  };

  const fetchSuggestions = (text) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!text || !text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await api.get("/properties/filters/suggestions", {
          params: { q: text },
        });
        const raw = res.data || [];
        const ranked = rankSuggestions(raw, text);
        setSuggestions(ranked);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
        setSuggestions([]);
      }
    }, 300);
  };

  const rankSuggestions = (raw, q) => {
    const query = (q || "").toLowerCase().trim();
    const popMap = {};
    popularLocalities.forEach((p) => {
      const k = `${p.city}|||${p.area}`;
      popMap[k] = p.count;
    });

    const normalized = raw
      .map((r) => {
        const v = (r.value || "").toString();
        const t = r.type || "project";
        let score = 0;
        const low = v.toLowerCase();
        if (low === query) score += 100;
        else if (low.startsWith(query)) score += 50;
        else if (low.includes(query)) score += 20;

        if (t === "area" || t === "city") {
          for (const p of popularLocalities) {
            if (t === "area" && p.area.toLowerCase() === low) {
              score += p.count * 2;
              break;
            }
            if (t === "city" && p.city.toLowerCase() === low) {
              score += (p.count || 0);
              break;
            }
          }
        }

        return { type: t, value: v, score };
      })
      .reduce(
        (acc, cur) => {
          const key = `${cur.type}|||${cur.value}`;
          if (!acc.map[key]) {
            acc.map[key] = cur;
            acc.order.push(cur);
          } else {
            if (cur.score > acc.map[key].score) acc.map[key] = cur;
          }
          return acc;
        },
        { map: {}, order: [] }
      ).order;

    const near = nearbyLocalities.map((n) => ({
      type: "area",
      value: `${n.area}, ${n.city}`,
      score: 40 - n.distanceKm,
    }));

    const popular = popularLocalities.slice(0, 15).map((p) => ({
      type: "area",
      value: `${p.area}, ${p.city}`,
      score: 10 + p.count,
    }));

    const combined = [...normalized, ...near, ...popular];

    const uniq = {};
    combined.forEach((it) => {
      const k = it.value.toLowerCase();
      if (!uniq[k] || it.score > uniq[k].score) uniq[k] = it;
    });

    return Object.values(uniq)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map((it) => ({ type: it.type, value: it.value }));
  };

  const clearFilters = () => {
    setCity("All");
    setArea("All");
    setType("");
    setListingType("");
    setBudget("");
    setKeyword("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const noFiltersApplied =
    city === "All" &&
    area === "All" &&
    type === "" &&
    listingType === "" &&
    budget === "" &&
    keyword.trim() === "";

  const filtered = (noFiltersApplied ? properties : properties).filter((p) => {
    if (p.active === false) return false;
    if (listingType && p.listingType !== listingType) return false;

    let matchCity = true;
    if (city !== "All") matchCity = (p.city || "").toLowerCase() === city.toLowerCase();

    let matchArea = true;
    if (area !== "All") matchArea = (p.areaName || "").toLowerCase() === area.toLowerCase();

    let matchType = true;
    if (type) matchType = p.propertyType === type;

    let matchBudget = true;
    if (budget) {
      const price = Number(p.price) || 0;
      switch (budget) {
        case "10":
          matchBudget = price <= 1000000;
          break;
        case "20":
          matchBudget = price > 1000000 && price <= 2000000;
          break;
        case "30":
          matchBudget = price > 2000000 && price <= 3000000;
          break;
        case "50":
          matchBudget = price > 3000000 && price <= 5000000;
          break;
        case "75":
          matchBudget = price > 5000000 && price <= 7500000;
          break;
        case "100":
          matchBudget = price > 7500000 && price <= 10000000;
          break;
        case "100plus":
          matchBudget = price > 10000000;
          break;
        default:
          matchBudget = true;
      }
    }

    let matchKeyword = true;
    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      matchKeyword =
        (p.title || "").toLowerCase().includes(q) ||
        (p.projectName || "").toLowerCase().includes(q) ||
        (p.areaName || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q);
    }

    return matchCity && matchArea && matchType && matchBudget && matchKeyword;
  });

  /* ------------------ UI ------------------ */
  return (
    <div style={styles.container}>
      {/* CSS Styles */}
      <style>{`
        :root {
          --hero-scroll-y: 0;
          --hero-parallax-strength: 0.25;
        }

        .searchBarFlex {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .services-scroll-container {
          overflow: hidden;
          position: relative;
          padding: 10px 0;
        }

        .services-scroll-container::before,
        .services-scroll-container::after {
          content: '';
          position: absolute;
          top: 0;
          width: 60px;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .services-scroll-container::before {
          left: 0;
          background: linear-gradient(to right, #f7f9fb 0%, transparent 100%);
        }

        .services-scroll-container::after {
          right: 0;
          background: linear-gradient(to left, #f7f9fb 0%, transparent 100%);
        }

        @media (max-width: 920px) {
          .searchBarFlex {
            gap: 8px;
          }
          .searchItemBox {
            min-width: 110px;
            padding: 8px 10px;
          }
        }

        @media (max-width: 820px) {
          .searchBarFlex {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px !important;
            border-radius: 12px !important;
          }
          .searchItemBox {
            width: 100% !important;
            margin-bottom: 8px !important;
            display: flex;
            align-items: center;
          }
          .searchInputBox {
            width: 100% !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>

      {/* ===== HERO SECTION ===== */}
      <section style={styles.heroWrap}>
        <div style={styles.slidesWrap}>
          {slideImages.map((img, idx) => {
            const active = idx === currentSlide;
            return (
              <div
                key={idx}
                aria-hidden={!active}
                style={{
                  ...styles.slide,
                  backgroundImage: `url("${img}")`,
                  opacity: active ? 1 : 0,
                  transform: active ? "scale(1)" : "scale(1.03)",
                  zIndex: active ? 1 : 0,
                }}
              />
            );
          })}
          <div style={styles.heroDarkOverlay} />
        </div>

        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            A Local Guide For All Your Real Estate Needs
          </h1>
          <p style={styles.heroDesc}>
            Find trusted properties, trending locations and personalized recommendations — fast.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 14 }}>
            <button
              style={styles.heroPrimaryBtn}
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Our Services
            </button>
            <button
              style={styles.heroGhostBtn}
              onClick={() => document.getElementById('properties-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Properties
            </button>
          </div>
        </div>

        <div style={styles.floatingSearchWrapper}>
          <div style={styles.searchBar} className="searchBarFlex">
            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>📍</span>
              <select style={styles.select} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="All">All Cities</option>
                {cities.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: city === "All" ? "none" : "flex", alignItems: "center" }} className="searchItemBox">
              <span style={styles.icon}>📌</span>
              <select style={styles.select} value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="All">All Areas</option>
                {areas.map((a, i) => (
                  <option key={i} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>🏠</span>
              <select style={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Property Type</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Open Plot">Plot</option>
                <option value="Independent House">Independent House</option>
              </select>   
            </div>

            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>📄</span>
              <select
                style={styles.select}
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
              >
                <option value="">All Listings</option>
                <option value="Sell">Sell</option>
                <option value="Rent">Rent</option>
                <option value="Lease">Lease</option>
                <option value="PG">PG</option>
                <option value="Farm Lease">Farm Lease</option>
              </select>
            </div>

            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>💰</span>
              <select style={styles.select} value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Budget</option>
                <option value="10">Below ₹10 Lakh</option>
                <option value="20">₹10–20 Lakh</option>
                <option value="30">₹20–30 Lakh</option>
                <option value="50">₹30–50 Lakh</option>
                <option value="75">₹50–75 Lakh</option>
                <option value="100">₹75 Lakh – ₹1 Cr</option>
                <option value="100plus">Above ₹1 Crore</option>
              </select>
            </div>

            <div style={styles.searchInputWrap} className="searchInputBox">
              <input
                style={styles.searchInput}
                placeholder="Search city / area / project / landmark…"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => {
                  if (keyword.trim()) setShowSuggestions(true);
                }}
              />
            </div>

            <div style={{ minWidth: 120 }}>
              <button
                style={styles.searchBtn}
                onClick={() => {
                  setShowSuggestions(false);
                }}
              >
                Search
              </button>
            </div>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.suggestionBox}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  style={styles.suggestionItem}
                  onClick={() => {
                    const v = s.value;
                    if (v.includes(",")) {
                      const [areaName, cityName] = v.split(",").map((x) => x.trim());
                      setCity(cityName);
                      setArea(areaName);
                    } else {
                      setKeyword(v);
                    }
                    setShowSuggestions(false);
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>{s.value}</span>
                    <span style={{ color: "#777", fontSize: 12 }}>({s.type})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== SERVICES SECTION (Right to Left Scrolling) ===== */}
      {services.length > 0 && (
        <section id="services-section" style={styles.servicesSection}>
          <h2 style={styles.sectionTitle}>Our Trusted Services & Partners</h2>
          <p style={styles.sectionSubtitle}>
            Premium services to help you with every aspect of real estate
          </p>
          
          <div className="services-scroll-container">
            <div
              ref={servicesSliderRef}
              style={styles.servicesRow}
              onMouseEnter={() => {
                if (servicesIntervalRef.current) {
                  clearInterval(servicesIntervalRef.current);
                  servicesIntervalRef.current = null;
                }
              }}
              onMouseLeave={() => {
                if (services.length && !servicesIntervalRef.current) {
                  servicesIntervalRef.current = setInterval(() => {
                    if (servicesSliderRef.current) {
                      const { scrollLeft, scrollWidth, clientWidth } = servicesSliderRef.current;
                      
                      if (scrollLeft + clientWidth >= scrollWidth - 10) {
                        servicesSliderRef.current.scrollTo({
                          left: 0,
                          behavior: "instant"
                        });
                      } else {
                        servicesSliderRef.current.scrollBy({
                          left: 1,
                          behavior: "auto"
                        });
                      }
                    }
                  }, 20);
                }
              }}
            >
              {/* Render services twice for seamless loop */}
              {[...services, ...services].map((service, index) => (
                <div 
                  key={`${service._id}-${index}`} 
                  style={styles.serviceCard}
                >
                  <div style={styles.serviceImage}>
                    <img
                      src={service.image}
                      alt={service.companyName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300x200?text=Service+Image";
                      }}
                    />
                    <div style={styles.serviceTypeBadge}>
                      {service.serviceType || "Service"}
                    </div>
                  </div>
                  
                  <div style={styles.serviceContent}>
                    <h3 style={styles.serviceTitle}>
                      {service.companyName}
                    </h3>
                    
                    <p style={styles.serviceDescription}>
                      {service.description?.length > 80 
                        ? `${service.description.substring(0, 80)}...` 
                        : service.description}
                    </p>
                    
                    <div style={styles.serviceDetails}>
                      <div style={styles.serviceDetailItem}>
                        <span style={styles.detailIcon}>📞</span>
                        <span>{service.contact}</span>
                      </div>
                      
                      {service.servicesOffered && (
                        <div style={styles.serviceDetailItem}>
                          <span style={styles.detailIcon}>⚙️</span>
                          <span style={styles.servicesList}>
                            {service.servicesOffered}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      style={styles.serviceButton}
                      onClick={() => {
                        // Handle service inquiry
                        alert(`Contact ${service.companyName} at ${service.contact}`);
                      }}
                    >
                      Contact Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== PROPERTIES SECTION ===== */}
      <section id="properties-section" style={styles.propertiesSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Featured Properties</h2>
          {(city !== "All" || area !== "All" || type || listingType || budget || keyword) && (
            <button 
              style={styles.clearFilterBtn}
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div style={styles.filterSummary}>
          Showing {filtered.length} of {properties.length} properties
          {city !== "All" && ` in ${city}`}
          {area !== "All" && `, ${area}`}
          {listingType && ` (${listingType})`}
          {type && ` (${type})`}
        </div>

        <div style={styles.grid}>
          {filtered.length === 0 ? (
            <div style={styles.noResults}>
              <h3>No properties found for selected filters</h3>
              <p>Try adjusting your search criteria</p>
              <button 
                style={styles.clearFilterBtn}
                onClick={clearFilters}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p._id} style={styles.card} onClick={() => navigate(`/property/${p._id}`)}>
                <div style={styles.cardImage}>
                  <img
                    src={p.images?.[0] ? `${BASE_URL}${p.images[0]}` : "https://via.placeholder.com/600x350?text=No+Image"}
                    alt={p.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {p.listingType && (
                    <div style={styles.listingBadge}>
                      {p.listingType}
                    </div>
                  )}
                </div>

                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{p.title}</h3>
                  <div style={styles.metaRow}>
                    <div style={styles.meta}>
                      <span style={styles.metaIcon}>📍</span>
                      {p.areaName || "Unknown"}
                    </div>
                    <div style={styles.meta}>
                      <span style={styles.metaIcon}>🏙️</span>
                      {p.city || ""}
                    </div>
                    {p.propertyType && (
                      <div style={styles.meta}>
                        <span style={styles.metaIcon}>🏠</span>
                        {p.propertyType}
                      </div>
                    )}
                  </div>
                  <div style={styles.price}>
                    ₹ {Number(p.price || 0).toLocaleString("en-IN")}
                    {p.listingType === "Rent" && <span style={styles.rentPeriod}> / month</span>}
                  </div>
                  <button style={styles.detailBtn}>
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

/* ===================== STYLES ===================== */
const styles = {
  container: {
    padding: "18px 28px",
    marginTop: "10px",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    background: "#f7f9fb",
    minHeight: "100vh",
  },

  /* ----- Hero ----- */
  heroWrap: {
    position: "relative",
    height: 520,
    borderRadius: 16,
    overflow: "visible",
    marginBottom: 120,
  },

  slidesWrap: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    borderRadius: 16,
  },

  slide: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "opacity 900ms ease, transform 1200ms ease",
    willChange: "opacity, transform",
  },

  heroDarkOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(2,6,23,0.25) 0%, rgba(2,6,23,0.55) 60%, rgba(2,6,23,0.72) 100%)",
    mixBlendMode: "multiply",
    pointerEvents: "none",
  },

  heroInner: {
    position: "relative",
    zIndex: 4,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingLeft: 20,
    paddingRight: 20,
    textAlign: "center",
    color: "#fff",
    pointerEvents: "none",
  },

  heroTitle: {
    fontSize: 40,
    fontWeight: 900,
    margin: 0,
    marginBottom: 12,
    letterSpacing: -0.5,
    color: "#fff",
    textShadow: "0 6px 26px rgba(2,6,23,0.6)",
    pointerEvents: "auto",
  },

  heroDesc: {
    fontSize: 16,
    maxWidth: 820,
    opacity: 0.95,
    margin: 0,
    color: "#f1f5f9",
    pointerEvents: "auto",
  },

  heroPrimaryBtn: {
    padding: "12px 26px",
    fontSize: 15,
    fontWeight: 800,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg,#ffd34d,#ffb347)",
    color: "#111",
    boxShadow: "0 12px 40px rgba(0,0,0,0.24)",
    pointerEvents: "auto",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 16px 50px rgba(0,0,0,0.28)",
    },
  },

  heroGhostBtn: {
    padding: "10px 18px",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    background: "transparent",
    color: "#fff",
    pointerEvents: "auto",
    transition: "background 0.2s, border-color 0.2s",
    "&:hover": {
      background: "rgba(255,255,255,0.1)",
      borderColor: "rgba(255,255,255,0.3)",
    },
  },

  floatingSearchWrapper: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: -60,
    width: "100%",
    maxWidth: 1500,
    zIndex: 6,
    padding: 14,
    boxSizing: "border-box",
  },

  searchBar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "#fff",
    padding: 14,
    borderRadius: 12,
    boxShadow: "0 20px 50px rgba(10,20,40,0.12)",
    flexWrap: "wrap",
  },

  searchItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: "#f6f8fb",
    borderRadius: 999,
    minWidth: 150,
  },

  icon: {
    fontSize: 18,
    marginRight: 6,
  },

  select: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 15,
    width: "100%",
    cursor: "pointer",
  },

  searchInputWrap: {
    flex: 1,
    minWidth: 180,
    display: "flex",
  },

  searchInput: {
    width: "100%",
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #e6e9ef",
    outline: "none",
    fontSize: 15,
  },

  searchBtn: {
    background: "#0b5fff",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 999,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.2s",
    width: "100%",
    "&:hover": {
      background: "#094ccc",
      transform: "translateY(-1px)",
    },
  },

  suggestionBox: {
    marginTop: 10,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
    padding: 8,
    maxHeight: 300,
    overflowY: "auto",
    position: "relative",
    zIndex: 50,
  },

  suggestionItem: {
    padding: 10,
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 6,
    background: "#fff",
    transition: "background 0.2s",
    "&:hover": {
      background: "#f0f4ff",
    },
  },

  /* ----- Services Section ----- */
  servicesSection: {
    marginTop: 80,
    marginBottom: 60,
    position: "relative",
  },

  sectionTitle: {
    fontSize: 32,
    marginBottom: 12,
    fontWeight: 800,
    color: "#1a1a1a",
    textAlign: "center",
  },

  sectionSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    maxWidth: 600,
    marginLeft: "auto",
    marginRight: "auto",
  },

  servicesRow: {
    display: "flex",
    gap: 25,
    overflowX: "auto",
    padding: "20px 0",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },

  serviceCard: {
    minWidth: 320,
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
    },
  },

  serviceImage: {
    height: 200,
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },

  serviceTypeBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    backdropFilter: "blur(4px)",
  },

  serviceContent: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
  },

  serviceTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
    lineHeight: 1.3,
  },

  serviceDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 1.5,
    margin: 0,
    flex: 1,
  },

  serviceDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
  },

  serviceDetailItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#555",
  },

  detailIcon: {
    fontSize: 16,
    opacity: 0.7,
  },

  servicesList: {
    fontSize: 13,
    color: "#666",
    lineHeight: 1.4,
  },

  serviceButton: {
    marginTop: 12,
    padding: "12px 20px",
    background: "linear-gradient(90deg, #0b5fff, #0066ff)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
    transition: "all 0.2s",
    "&:hover": {
      background: "linear-gradient(90deg, #094ccc, #0052cc)",
      transform: "translateY(-2px)",
      boxShadow: "0 5px 15px rgba(11, 95, 255, 0.3)",
    },
  },

  /* ----- Properties Section ----- */
  propertiesSection: {
    marginTop: 60,
    paddingTop: 40,
    borderTop: "1px solid #e6e9ef",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  filterSummary: {
    background: "#fff",
    padding: "14px 20px",
    borderRadius: 12,
    marginBottom: 30,
    color: "#555",
    fontSize: 15,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },

  clearFilterBtn: {
    padding: "8px 16px",
    background: "#f0f4ff",
    color: "#0b5fff",
    border: "1px solid #0b5fff",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    transition: "all 0.2s",
    "&:hover": {
      background: "#0b5fff",
      color: "#fff",
    },
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 28,
  },

  card: {
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(10,20,40,0.06)",
    display: "flex",
    flexDirection: "column",
    minHeight: 340,
    cursor: "pointer",
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: "0 20px 50px rgba(10,20,40,0.12)",
    },
  },

  cardImage: {
    height: 200,
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },

  listingBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    backdropFilter: "blur(4px)",
  },

  cardBody: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
    lineHeight: 1.4,
  },

  metaRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  meta: {
    background: "#f4f6f8",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    color: "#555",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  metaIcon: {
    fontSize: 14,
    opacity: 0.7,
  },

  price: {
    marginTop: "auto",
    color: "#d32f2f",
    fontWeight: 800,
    fontSize: 22,
  },

  rentPeriod: {
    fontSize: 14,
    fontWeight: 400,
    color: "#777",
    marginLeft: 4,
  },

  detailBtn: {
    marginTop: 10,
    borderRadius: 8,
    padding: "12px 16px",
    background: "#0b5fff",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
    transition: "all 0.2s",
    textAlign: "center",
    "&:hover": {
      background: "#094ccc",
    },
  },

  noResults: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "60px 20px",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
  },
};