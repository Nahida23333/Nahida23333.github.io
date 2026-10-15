(() => {
  const root = document.querySelector('.home-dashboard');
  if (!root) return;

  const searchForm = document.querySelector('#home-search-form');
  const searchInput = document.querySelector('#home-search-input');
  const searchResults = document.querySelector('#home-search-results');
  const dashboardGrid = document.querySelector('.home-dashboard__grid');
  let searchIndexPromise = null;
  let searchRunId = 0;
  let searchDebounce = 0;

  const loadSearchIndex = () => {
    if (searchIndexPromise) return searchIndexPromise;
    const localSearchConfig = typeof GLOBAL_CONFIG !== 'undefined' ? GLOBAL_CONFIG.localSearch : null;
    if (!localSearchConfig || !localSearchConfig.path) {
      return Promise.reject(new Error('Local search is not configured.'));
    }
    const searchUrl = new URL(localSearchConfig.path, document.baseURI);
    searchIndexPromise = fetch(searchUrl.href)
      .then((response) => {
        if (!response.ok) throw new Error('Search index request failed.');
        return response.text();
      })
      .then((xmlText) => {
        const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
        if (xml.querySelector('parsererror')) throw new Error('Search index is invalid.');
        return Array.from(xml.querySelectorAll('entry')).map((entry) => {
          const title = entry.querySelector('title')?.textContent.trim() || '';
          const rawContent = entry.querySelector('content')?.textContent || '';
          const content = rawContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const rawUrl = entry.querySelector('url')?.textContent.trim() || '';
          let url = '';
          try {
            const parsedUrl = new URL(rawUrl, document.baseURI);
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') url = parsedUrl.href;
          } catch (error) {}
          return { title, content, url };
        }).filter((entry) => entry.title && entry.url);
      })
      .catch((error) => {
        searchIndexPromise = null;
        throw error;
      });
    return searchIndexPromise;
  };

  const makeSearchMessage = (text, className) => {
    const node = document.createElement('p');
    node.className = className;
    node.textContent = text;
    return node;
  };

  const makeSearchResult = (entry, terms) => {
    const card = document.createElement('article');
    card.className = 'home-search-result';

    const link = document.createElement('a');
    link.className = 'home-search-result__link';
    link.href = entry.url;
    link.title = entry.title;

    const body = document.createElement('div');
    body.className = 'home-search-result__body';
    const title = document.createElement('strong');
    title.className = 'home-search-result__title';
    title.textContent = entry.title;
    body.appendChild(title);

    if (entry.content) {
      const lowerContent = entry.content.toLowerCase();
      const positions = terms.map((term) => lowerContent.indexOf(term)).filter((position) => position >= 0);
      const firstPosition = positions.length ? Math.min(...positions) : 0;
      const start = Math.max(0, firstPosition - 50);
      const end = Math.min(entry.content.length, start + 170);
      const excerpt = document.createElement('span');
      excerpt.className = 'home-search-result__excerpt';
      excerpt.textContent = (start > 0 ? '…' : '') + entry.content.slice(start, end).trim() + (end < entry.content.length ? '…' : '');
      body.appendChild(excerpt);
    }

    const meta = document.createElement('span');
    meta.className = 'home-search-result__meta';
    meta.textContent = '点击阅读文章';
    body.appendChild(meta);

    const cover = document.createElement('span');
    cover.className = 'home-search-result__cover';
    const icon = document.createElement('i');
    icon.className = 'fas fa-feather-alt home-search-result__icon';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'home-search-result__cover-label';
    label.textContent = '全站文章';
    cover.append(icon, label);

    link.append(body, cover);
    card.appendChild(link);
    return card;
  };

  const performHomeSearch = async () => {
    if (!searchInput || !searchResults) return;
    const query = searchInput.value.trim();
    const runId = ++searchRunId;

    if (!query) {
      searchResults.hidden = true;
      searchResults.setAttribute('aria-busy', 'false');
      searchResults.replaceChildren();
      if (dashboardGrid) dashboardGrid.hidden = false;
      return;
    }

    searchResults.hidden = false;
    searchResults.setAttribute('aria-busy', 'true');
    if (dashboardGrid) dashboardGrid.hidden = true;
    searchResults.replaceChildren(makeSearchMessage('正在搜索全站文章…', 'home-search-results__summary'));

    try {
      const entries = await loadSearchIndex();
      if (runId !== searchRunId) return;
      const terms = query.toLowerCase().split(/[-\s]+/).filter(Boolean);
      const matches = entries.filter((entry) => {
        const searchable = (entry.title + ' ' + entry.content).toLowerCase();
        return terms.every((term) => searchable.includes(term));
      });
      matches.sort((left, right) => {
        const score = (entry) => terms.reduce((total, term) => total + (entry.title.toLowerCase().includes(term) ? 2 : 0), 0);
        return score(right) - score(left);
      });

      const summary = makeSearchMessage('找到 ' + matches.length + ' 篇相关文章', 'home-search-results__summary');
      searchResults.replaceChildren(summary);
      if (!matches.length) {
        searchResults.appendChild(makeSearchMessage('没有找到“' + query + '”相关的文章。', 'home-search-results__empty'));
      } else {
        const list = document.createElement('div');
        list.className = 'home-search-results__list';
        const fragment = document.createDocumentFragment();
        matches.forEach((entry) => fragment.appendChild(makeSearchResult(entry, terms)));
        list.appendChild(fragment);
        searchResults.appendChild(list);
      }
      searchResults.setAttribute('aria-busy', 'false');
    } catch (error) {
      if (runId !== searchRunId) return;
      searchResults.replaceChildren(makeSearchMessage('本地搜索索引暂时无法加载，请稍后重试。', 'home-search-results__empty'));
      searchResults.setAttribute('aria-busy', 'false');
    }
  };

  if (searchForm && searchInput && searchResults) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      window.clearTimeout(searchDebounce);
      performHomeSearch();
    });
    searchInput.addEventListener('input', () => {
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(performHomeSearch, 180);
    });
  }
  const timeNode = document.querySelector('#home-clock-time');
  const dateNode = document.querySelector('#home-clock-date');
  const updateClock = () => {
    const now = new Date();
    if (timeNode) timeNode.textContent = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).format(now);
    if (dateNode) dateNode.textContent = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    }).format(now);
  };
  updateClock();
  window.setInterval(updateClock, 1000);

  const calendar = document.querySelector('#home-calendar-grid');
  const monthNode = document.querySelector('#home-calendar-month');
  if (calendar && monthNode) {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    const week = ['日', '一', '二', '三', '四', '五', '六'];
    const render = () => {
      calendar.replaceChildren();
      monthNode.textContent = year + '年' + (month + 1) + '月';
      week.forEach((label) => {
        const cell = document.createElement('span');
        cell.className = 'home-calendar__weekday';
        cell.textContent = label;
        calendar.appendChild(cell);
      });
      const offset = new Date(year, month, 1).getDay();
      const total = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < offset; i += 1) {
        const blank = document.createElement('span');
        blank.className = 'home-calendar__blank';
        blank.setAttribute('aria-hidden', 'true');
        calendar.appendChild(blank);
      }
      for (let day = 1; day <= total; day += 1) {
        const cell = document.createElement('span');
        cell.className = 'home-calendar__day';
        cell.textContent = String(day);
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
          cell.classList.add('home-calendar__day--today');
          cell.setAttribute('aria-current', 'date');
        }
        calendar.appendChild(cell);
      }
    };
    document.querySelector('#home-calendar-prev')?.addEventListener('click', () => {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
      render();
    });
    document.querySelector('#home-calendar-next')?.addEventListener('click', () => {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      render();
    });
    render();
  }

  const button = document.querySelector('#home-weather-locate');
  const status = document.querySelector('#home-weather-location');
  const intro = document.querySelector('#home-weather-intro');
  const temperature = document.querySelector('#home-weather-temperature');
  const description = document.querySelector('#home-weather-description');
  const icon = document.querySelector('#home-weather-icon');
  const feels = document.querySelector('#home-weather-feels');
  const wind = document.querySelector('#home-weather-wind');
  const forecast = document.querySelector('#home-weather-forecast');
  const guangzhou = { latitude: 23.1291, longitude: 113.2644 };
  let weatherRequestId = 0;
  let cityRequestId = 0;

  const weatherLabel = (code) => {
    if (code === 0) return ['☀️', '晴朗'];
    if (code === 1) return ['🌤️', '大致晴朗'];
    if (code === 2) return ['⛅', '局部多云'];
    if (code === 3) return ['☁️', '阴天'];
    if (code === 45 || code === 48) return ['🌫️', '有雾'];
    if ([51, 53, 55, 56, 57].includes(code)) return ['🌦️', '毛毛雨'];
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['🌧️', '有雨'];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ['🌨️', '有雪'];
    if ([95, 96, 99].includes(code)) return ['⛈️', '雷雨'];
    return ['🌡️', '天气已更新'];
  };

  const getCityName = async (lat, lon) => {
    // Send city-level coordinates only and cache the city name locally for 30 days.
    const roundedLat = Number(lat).toFixed(2);
    const roundedLon = Number(lon).toFixed(2);
    const cacheKey = 'home-weather-city-v1-' + roundedLat + '-' + roundedLon;
    try {
      const cached = JSON.parse(window.localStorage.getItem(cacheKey) || 'null');
      if (cached && typeof cached.city === 'string' && cached.expiresAt > Date.now()) return cached.city;
    } catch (error) {}

    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: roundedLat,
      lon: roundedLon,
      zoom: '10',
      addressdetails: '1',
      'accept-language': 'zh-CN'
    });
    const response = await fetch('https://nominatim.openstreetmap.org/reverse?' + params.toString(), {
      referrerPolicy: 'strict-origin-when-cross-origin'
    });
    if (!response.ok) throw new Error('reverse geocoding request failed');
    const data = await response.json();
    const address = data.address || {};
    const city = address.city || address.municipality || address.town || address.village || address.county || address.state_district || '';
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify({
        city,
        expiresAt: Date.now() + (city ? 30 * 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000)
      }));
    } catch (error) {}
    return city;
  };

  const updateCityName = async (lat, lon) => {
    const requestId = ++cityRequestId;
    try {
      const city = await getCityName(lat, lon);
      if (requestId !== cityRequestId) return;
      if (status) status.textContent = city || '当前位置';
    } catch (error) {
      if (requestId === cityRequestId && status) status.textContent = '当前位置';
    }
  };

  const getWeather = async (lat, lon) => {
    const requestId = ++weatherRequestId;
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      forecast_days: '3',
      timezone: 'auto'
    });
    const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params.toString());
    if (!response.ok) throw new Error('weather request failed');
    const data = await response.json();
    if (!data.current) throw new Error('weather data missing');
    if (requestId !== weatherRequestId) return;

    const current = weatherLabel(data.current.weather_code);
    if (temperature) temperature.textContent = Math.round(data.current.temperature_2m) + '°';
    if (description) description.textContent = current[1];
    if (icon) icon.textContent = current[0];
    if (feels) feels.textContent = Math.round(data.current.apparent_temperature) + '°';
    if (wind) wind.textContent = Math.round(data.current.wind_speed_10m) + ' km/h';

    if (forecast && data.daily) {
      forecast.replaceChildren();
      data.daily.time.forEach((dayText, index) => {
        const item = document.createElement('div');
        item.className = 'home-weather__day';
        const dayDate = new Date(dayText + 'T12:00:00');
        const dayName = index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(dayDate);
        const dayWeather = weatherLabel(data.daily.weather_code[index]);
        const label = document.createElement('span');
        label.textContent = dayName + ' ' + dayWeather[0];
        label.setAttribute('aria-label', dayName + '，' + dayWeather[1]);
        const range = document.createElement('strong');
        range.textContent = Math.round(data.daily.temperature_2m_min[index]) + '° / ' + Math.round(data.daily.temperature_2m_max[index]) + '°';
        item.append(label, range);
        forecast.appendChild(item);
      });
    }
  };

  const loadGuangzhouWeather = async () => {
    if (status) status.textContent = '广州市';
    const request = getWeather(guangzhou.latitude, guangzhou.longitude);
    const requestId = weatherRequestId;
    try {
      await request;
    } catch (error) {
      if (requestId !== weatherRequestId) return;
      if (temperature) temperature.textContent = '--°';
      if (description) description.textContent = '天气暂不可用';
      if (icon) icon.textContent = '🌡️';
      if (feels) feels.textContent = '--°';
      if (wind) wind.textContent = '--';
      if (forecast) forecast.replaceChildren();
    }
  };

  const requestLocation = () => {
    cityRequestId += 1;
    if (!navigator.geolocation) {
      if (status) status.textContent = '广州市';
      if (intro) intro.textContent = '此浏览器不支持定位，当前显示广州市天气。';
      if (button) {
        button.disabled = true;
        button.textContent = '浏览器不支持定位';
      }
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = '正在请求定位…';
    }
    if (status) status.textContent = '广州市';
    if (intro) intro.textContent = '正在请求定位；授权前显示广州市天气。';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (status) status.textContent = '正在查询当前位置…';
        try {
          await getWeather(position.coords.latitude, position.coords.longitude);
          if (status) status.textContent = '当前位置';
          void updateCityName(position.coords.latitude, position.coords.longitude);
          if (intro) intro.textContent = '已根据设备定位更新天气。';
          if (button) button.textContent = '重新获取定位';
        } catch (error) {
          if (status) status.textContent = '广州市';
          if (intro) intro.textContent = '定位已取得，但天气暂不可用；当前显示广州市天气。';
          await loadGuangzhouWeather();
          if (button) button.textContent = '重试定位';
        } finally {
          if (button) button.disabled = false;
        }
      },
      (error) => {
        if (status) status.textContent = '广州市';
        if (intro) {
          intro.textContent = error.code === 1
            ? '未获得定位授权，继续显示广州市天气；允许站点定位后可重试。'
            : error.code === 3
              ? '定位超时，继续显示广州市天气。'
              : '无法获取设备位置，继续显示广州市天气。';
        }
        if (button) {
          button.disabled = false;
          button.textContent = '重新请求定位';
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  };

  if (status) status.textContent = '广州市';
  if (intro) intro.textContent = '默认显示广州市天气，正在请求设备定位。';
  loadGuangzhouWeather();
  requestLocation();
})();
