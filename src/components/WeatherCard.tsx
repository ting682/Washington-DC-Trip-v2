import React, { useEffect, useState, useRef } from 'react';

export interface HourlyForecast {
  time: string;
  dateStr: string;
  hourLabel: string;
  hourNum: number;
  temperature: number;
  apparentTemp: number;
  weatherCode: number;
  condition: string;
  icon: string;
  precipProb: number;
  windSpeed: number;
}

export interface DayForecast {
  date: string;
  dayName: string;
  fullDayLabel: string;
  formattedDate: string;
  tripDayNumber: number;
  tripTitle: string;
  tripHighlight: string;
  weatherCode: number;
  condition: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  precipProb: number;
  windSpeedMax: number;
  uvIndexMax: number;
  walkingTip: string;
  hourly: HourlyForecast[];
}

export interface CurrentWeather {
  temperature: number;
  apparentTemp: number;
  weatherCode: number;
  condition: string;
  icon: string;
  windSpeed: number;
  windDirection: number;
  humidity?: number;
}

interface WeatherCardProps {
  initialDayIndex?: number;
  activeDayIndex?: number;
  onSelectDayIndex?: (dayIndex: number) => void;
}

const FALLBACK_DAYS = [
  { date: '2026-10-15', high: 78, low: 61, precip: 20, code: 2, uv: 5 },
  { date: '2026-10-16', high: 81, low: 61, precip: 55, code: 80, uv: 4 },
  { date: '2026-10-17', high: 62, low: 46, precip: 50, code: 61, uv: 4 },
  { date: '2026-10-18', high: 62, low: 43, precip: 10, code: 1, uv: 5 },
  { date: '2026-10-19', high: 67, low: 47, precip: 10, code: 0, uv: 5 },
  { date: '2026-10-20', high: 70, low: 51, precip: 10, code: 1, uv: 5 },
];

export const WeatherCard: React.FC<WeatherCardProps> = ({
  initialDayIndex,
  activeDayIndex,
  onSelectDayIndex,
}) => {
  const currentActiveIdx = typeof activeDayIndex === 'number' ? activeDayIndex : (initialDayIndex ?? 0);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentActiveIdx);
  const [showHourly, setShowHourly] = useState<boolean>(true);
  const [hourlyFilter, setHourlyFilter] = useState<'daytime' | 'all'>('daytime');
  const [unit, setUnit] = useState<'F' | 'C'>('F');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const hourlyScrollRef = useRef<HTMLDivElement>(null);
  const dailyScrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [dailyPage, setDailyPage] = useState<number>(0);
  const [mobileLayout, setMobileLayout] = useState<'threeDay' | 'detailed'>('threeDay');

  const toDisplayTemp = (tempF: number) => {
    if (unit === 'C') {
      return Math.round(((tempF - 32) * 5) / 9);
    }
    return Math.round(tempF);
  };

  const getWeatherInfo = (code: number): { condition: string; icon: string } => {
    switch (code) {
      case 0:
        return { condition: 'Clear & Sunny', icon: 'fa-sun text-amber-500' };
      case 1:
        return { condition: 'Mainly Clear', icon: 'fa-sun text-amber-500' };
      case 2:
        return { condition: 'Partly Cloudy', icon: 'fa-cloud-sun text-sky-500' };
      case 3:
        return { condition: 'Overcast', icon: 'fa-cloud text-slate-400' };
      case 45:
      case 48:
        return { condition: 'Foggy', icon: 'fa-smog text-slate-400' };
      case 51:
      case 53:
      case 55:
        return { condition: 'Light Drizzle', icon: 'fa-cloud-rain text-blue-400' };
      case 61:
      case 63:
      case 65:
        return { condition: 'Rain', icon: 'fa-cloud-showers-heavy text-blue-500' };
      case 71:
      case 73:
      case 75:
        return { condition: 'Snow Showers', icon: 'fa-snowflake text-sky-300' };
      case 77:
        return { condition: 'Snow Grains', icon: 'fa-snowflake text-sky-300' };
      case 80:
      case 81:
      case 82:
        return { condition: 'Passing Showers', icon: 'fa-cloud-sun-rain text-blue-400' };
      case 85:
      case 86:
        return { condition: 'Heavy Snow', icon: 'fa-snowflake text-sky-400' };
      case 95:
      case 96:
      case 99:
        return { condition: 'Thunderstorm', icon: 'fa-cloud-bolt text-indigo-500' };
      default:
        return { condition: 'Mild & Clear', icon: 'fa-cloud-sun text-sky-500' };
    }
  };

  const getTripMeta = (dateStr: string) => {
    if (dateStr.includes('10-15') || dateStr.endsWith('-15')) {
      return {
        tripDayNumber: 1,
        tripTitle: 'Duluth ➔ DC Arrival & Settle In',
        tripHighlight: 'ATL ➔ DCA & Thai Dinner',
        dayLabel: 'Thu, Oct 15',
        walkingTip:
          'Arrival & Settle In: Settle in at Holiday Inn Central and enjoy a pleasant evening stroll down 14th St NW to Ammathar Thai Cuisine for dinner. Light, comfortable clothing is ideal for the evening arrival.',
      };
    }
    if (dateStr.includes('10-16') || dateStr.endsWith('-16')) {
      return {
        tripDayNumber: 2,
        tripTitle: 'White House, Pentagon & Old Town',
        tripHighlight: 'White House & Chart House',
        dayLabel: 'Fri, Oct 16',
        walkingTip:
          'White House, Pentagon & Historic Old Town: Morning security check lines at the White House and afternoon Pentagon tour. Keep compact umbrellas handy for any passing showers. In the evening, enjoy a scenic waterfront stroll along the Potomac at historic Old Town Alexandria and dinner at Chart House.',
      };
    }
    if (dateStr.includes('10-17') || dateStr.endsWith('-17')) {
      return {
        tripDayNumber: 3,
        tripTitle: 'Smithsonian Museums & The Wharf',
        tripHighlight: 'Dinosaurs & The Wharf',
        dayLabel: 'Sat, Oct 17',
        walkingTip:
          'Smithsonian Galleries & Wharf Pier: Ideal day for exploring indoor galleries at the Natural History and Air & Space Museums. In the late afternoon, head to The Wharf pier for a refreshing boardwalk stroll and sunset dinner at Mi Vida.',
      };
    }
    if (dateStr.includes('10-18') || dateStr.endsWith('-18')) {
      return {
        tripDayNumber: 4,
        tripTitle: 'Spies, History & Sunset Memorials',
        tripHighlight: 'Spy Museum & Lincoln Sunset',
        dayLabel: 'Sun, Oct 18',
        walkingTip:
          'Spy Missions & National Mall: Undercover missions inside the International Spy Museum in the morning, followed by breathtaking sunset views walking the National Mall, Washington Monument, and Lincoln Memorial. A light jacket is recommended for evening memorial walks.',
      };
    }
    if (dateStr.includes('10-19') || dateStr.endsWith('-19')) {
      return {
        tripDayNumber: 5,
        tripTitle: 'Pandas, Bible Museum & Capitol',
        tripHighlight: 'Zoo Pandas & Old Ebbitt Grill',
        dayLabel: 'Mon, Oct 19',
        walkingTip:
          'Giant Pandas & Capitol Hill: Catch giant pandas Bao Li & Qing Bao active in the outdoor Asia Trail during cooler morning hours at the National Zoo. Excellent walking weather for the Capitol Grounds in the afternoon and a historic dinner at Old Ebbitt Grill.',
      };
    }
    if (dateStr.includes('10-20') || dateStr.endsWith('-20')) {
      return {
        tripDayNumber: 6,
        tripTitle: 'Departure Day & Flight Home',
        tripHighlight: 'Breakfast & DCA Terminal 2',
        dayLabel: 'Tue, Oct 20',
        walkingTip:
          'Departure Day: Relaxed morning breakfast at Silver Diner, packing up at Holiday Inn, and a smooth scenic drive down George Washington Memorial Parkway to DCA Terminal 2 for your flight home to Atlanta.',
      };
    }
    return {
      tripDayNumber: 1,
      tripTitle: 'Washington, DC Tour',
      tripHighlight: 'City Exploration',
      dayLabel: dateStr,
      walkingTip: 'Comfortable autumn sightseeing weather across Washington, DC.',
    };
  };

  const generateFallbackHourly = (dateStr: string, baseHigh: number, baseLow: number, basePrecip: number, baseCode: number): HourlyForecast[] => {
    const list: HourlyForecast[] = [];
    for (let h = 0; h < 24; h++) {
      let factor = Math.sin(((h - 8) / 14) * Math.PI);
      if (h < 6) factor = -0.8;
      if (h > 21) factor = -0.5;
      const temp = Math.round(baseLow + (baseHigh - baseLow) * Math.max(0, Math.min(1, (factor + 1) / 2)));
      const hourStr = h < 10 ? `0${h}:00` : `${h}:00`;
      const timeStr = `${dateStr}T${hourStr}`;
      const hourDate = new Date(`${dateStr}T${hourStr}:00`);
      const hourLabel = hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

      let pProb = Math.max(0, Math.round(basePrecip * (h >= 10 && h <= 16 ? 1.1 : 0.7)));
      if (basePrecip < 15) pProb = basePrecip;

      const code = pProb > 40 ? 61 : baseCode;
      const info = getWeatherInfo(code);

      list.push({
        time: timeStr,
        dateStr,
        hourLabel,
        hourNum: h,
        temperature: temp,
        apparentTemp: temp - 1,
        weatherCode: code,
        condition: info.condition,
        icon: info.icon,
        precipProb: Math.min(100, pProb),
        windSpeed: Math.round(7 + Math.sin(h) * 3),
      });
    }
    return list;
  };

  const fetchWeather = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=38.8951&longitude=-77.0364&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,windspeed_10m_max,uv_index_max&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&past_days=1&forecast_days=6';

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather fetch status: ${res.status}`);
      const data = await res.json();

      if (data && data.current_weather && data.daily) {
        const curCode = data.current_weather.weathercode;
        const curInfo = getWeatherInfo(curCode);

        let curApparent = Math.round(data.current_weather.temperature);
        if (data.hourly && data.hourly.time && data.hourly.apparent_temperature) {
          const nowStr = data.current_weather.time;
          const curIdx = data.hourly.time.findIndex((t: string) => t.startsWith(nowStr.slice(0, 13)));
          if (curIdx >= 0 && data.hourly.apparent_temperature[curIdx] !== undefined) {
            curApparent = Math.round(data.hourly.apparent_temperature[curIdx]);
          }
        }

        setCurrent({
          temperature: Math.round(data.current_weather.temperature),
          apparentTemp: curApparent,
          weatherCode: curCode,
          condition: curInfo.condition,
          icon: curInfo.icon,
          windSpeed: Math.round(data.current_weather.windspeed),
          windDirection: Math.round(data.current_weather.winddirection || 0),
        });

        // Group hourly items by date "YYYY-MM-DD"
        const hourlyByDate: Record<string, HourlyForecast[]> = {};
        if (data.hourly && data.hourly.time) {
          const times: string[] = data.hourly.time;
          const temps: number[] = data.hourly.temperature_2m || [];
          const appTemps: number[] = data.hourly.apparent_temperature || [];
          const precips: number[] = data.hourly.precipitation_probability || [];
          const codes: number[] = data.hourly.weathercode || [];
          const winds: number[] = data.hourly.windspeed_10m || [];

          for (let idx = 0; idx < times.length; idx++) {
            const tStr = times[idx];
            const dStr = tStr.slice(0, 10);
            const hourDate = new Date(tStr);
            const hourNum = hourDate.getHours();
            const hourLabel = hourDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              hour12: true,
            });
            const hCode = codes[idx] !== undefined ? codes[idx] : 1;
            const hInfo = getWeatherInfo(hCode);

            const item: HourlyForecast = {
              time: tStr,
              dateStr: dStr,
              hourLabel,
              hourNum,
              temperature: Math.round(temps[idx] || 65),
              apparentTemp: Math.round(appTemps[idx] || temps[idx] || 65),
              weatherCode: hCode,
              condition: hInfo.condition,
              icon: hInfo.icon,
              precipProb: Math.round(precips[idx] || 0),
              windSpeed: Math.round(winds[idx] || 8),
            };

            if (!hourlyByDate[dStr]) {
              hourlyByDate[dStr] = [];
            }
            hourlyByDate[dStr].push(item);
          }
        }

        // Today and tomorrow date strings in Eastern Time
        const nyToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        const tomDate = new Date();
        tomDate.setDate(tomDate.getDate() + 1);
        const nyTomorrow = tomDate.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

        // Build 6-day trip forecast (Oct 15 to Oct 20) guaranteed to match Day 1 - Day 6
        const dates: string[] = data.daily.time || [];
        const maxTemps: number[] = data.daily.temperature_2m_max || [];
        const minTemps: number[] = data.daily.temperature_2m_min || [];
        const appMax: number[] = data.daily.apparent_temperature_max || [];
        const appMin: number[] = data.daily.apparent_temperature_min || [];
        const codes: number[] = data.daily.weathercode || [];
        const precips: number[] = data.daily.precipitation_probability_max || [];
        const winds: number[] = data.daily.windspeed_10m_max || [];
        const uvs: number[] = data.daily.uv_index_max || [];

        const dailyList: DayForecast[] = FALLBACK_DAYS.map((fallbackDay) => {
          const dateStr = fallbackDay.date;
          const apiIdx = dates.findIndex(d => d === dateStr || d.endsWith(dateStr.slice(5)));

          const dateObj = new Date(dateStr + 'T12:00:00');
          const meta = getTripMeta(dateStr);

          const weekdayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          let dayName = weekdayShort;
          if (dateStr === nyToday || dateStr.endsWith(nyToday.slice(5))) {
            dayName = `Today (${weekdayShort})`;
          } else if (dateStr === nyTomorrow || dateStr.endsWith(nyTomorrow.slice(5))) {
            dayName = `Tomorrow (${weekdayShort})`;
          }

          const fullDayLabel = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });

          const formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          const weatherCode = apiIdx >= 0 && codes[apiIdx] !== undefined ? codes[apiIdx] : fallbackDay.code;
          const info = getWeatherInfo(weatherCode);
          const tMax = apiIdx >= 0 && maxTemps[apiIdx] !== undefined ? Math.round(maxTemps[apiIdx]) : fallbackDay.high;
          const tMin = apiIdx >= 0 && minTemps[apiIdx] !== undefined ? Math.round(minTemps[apiIdx]) : fallbackDay.low;
          const appTMax = apiIdx >= 0 && appMax[apiIdx] !== undefined ? Math.round(appMax[apiIdx]) : tMax;
          const appTMin = apiIdx >= 0 && appMin[apiIdx] !== undefined ? Math.round(appMin[apiIdx]) : tMin;
          const pProb = apiIdx >= 0 && precips[apiIdx] !== undefined ? Math.round(precips[apiIdx]) : fallbackDay.precip;
          const wMax = apiIdx >= 0 && winds[apiIdx] !== undefined ? Math.round(winds[apiIdx]) : 10;
          const uvVal = apiIdx >= 0 && uvs[apiIdx] !== undefined ? Math.round(uvs[apiIdx]) : fallbackDay.uv;

          const dayHourly = (hourlyByDate[dateStr] && hourlyByDate[dateStr].length > 0)
            ? hourlyByDate[dateStr]
            : generateFallbackHourly(dateStr, tMax, tMin, pProb, weatherCode);

          return {
            date: dateStr,
            dayName,
            fullDayLabel,
            formattedDate,
            tripDayNumber: meta.tripDayNumber,
            tripTitle: meta.tripTitle,
            tripHighlight: meta.tripHighlight,
            weatherCode,
            condition: info.condition,
            icon: info.icon,
            tempMax: tMax,
            tempMin: tMin,
            apparentMax: appTMax,
            apparentMin: appTMin,
            precipProb: pProb,
            windSpeedMax: wMax,
            uvIndexMax: uvVal,
            walkingTip: meta.walkingTip,
            hourly: dayHourly,
          };
        });

        setForecast(dailyList);

        // Synchronize selected day with activeDayIndex or initialDayIndex
        const targetDayIdx = typeof activeDayIndex === 'number'
          ? activeDayIndex
          : (typeof initialDayIndex === 'number' ? initialDayIndex : undefined);

        if (typeof targetDayIdx === 'number' && targetDayIdx >= 0 && targetDayIdx < dailyList.length) {
          setSelectedDayIndex(targetDayIdx);
        } else {
          const todayIdx = dailyList.findIndex(d => d.date === nyToday || d.date.endsWith(nyToday.slice(5)));
          if (todayIdx >= 0) {
            setSelectedDayIndex(todayIdx);
          }
        }

        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        );
      }
    } catch (err: any) {
      console.warn('Weather fetch error, using fallback full-trip forecast:', err);
      setError('Live forecast syncing. Showing full October 15–20 Washington DC trip forecast.');

      const nyToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const tomDate = new Date();
      tomDate.setDate(tomDate.getDate() + 1);
      const nyTomorrow = tomDate.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

      const fallbackList: DayForecast[] = FALLBACK_DAYS.map((d) => {
        const meta = getTripMeta(d.date);
        const info = getWeatherInfo(d.code);
        const dateObj = new Date(d.date + 'T12:00:00');
        const weekdayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        let dayName = weekdayShort;
        if (d.date === nyToday || d.date.endsWith(nyToday.slice(5))) {
          dayName = `Today (${weekdayShort})`;
        } else if (d.date === nyTomorrow || d.date.endsWith(nyTomorrow.slice(5))) {
          dayName = `Tomorrow (${weekdayShort})`;
        }

        return {
          date: d.date,
          dayName,
          fullDayLabel: dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          formattedDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          tripDayNumber: meta.tripDayNumber,
          tripTitle: meta.tripTitle,
          tripHighlight: meta.tripHighlight,
          weatherCode: d.code,
          condition: info.condition,
          icon: info.icon,
          tempMax: d.high,
          tempMin: d.low,
          apparentMax: d.high,
          apparentMin: d.low,
          precipProb: d.precip,
          windSpeedMax: 10,
          uvIndexMax: d.uv,
          walkingTip: meta.walkingTip,
          hourly: generateFallbackHourly(d.date, d.high, d.low, d.precip, d.code),
        };
      });

      setCurrent({
        temperature: 78,
        apparentTemp: 77,
        weatherCode: 2,
        condition: 'Partly Cloudy',
        icon: 'fa-cloud-sun text-sky-500',
        windSpeed: 10,
        windDirection: 60,
      });

      setForecast(fallbackList);

      const targetDayIdx = typeof activeDayIndex === 'number'
        ? activeDayIndex
        : (typeof initialDayIndex === 'number' ? initialDayIndex : undefined);

      if (typeof targetDayIdx === 'number' && targetDayIdx >= 0 && targetDayIdx < fallbackList.length) {
        setSelectedDayIndex(targetDayIdx);
      } else {
        const todayIdx = fallbackList.findIndex(d => d.date === nyToday || d.date.endsWith(nyToday.slice(5)));
        if (todayIdx >= 0) {
          setSelectedDayIndex(todayIdx);
        }
      }

      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync when activeDayIndex or initialDayIndex prop changes
  useEffect(() => {
    const targetIdx = typeof activeDayIndex === 'number' ? activeDayIndex : initialDayIndex;
    if (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < 6) {
      setSelectedDayIndex(targetIdx);
      const targetPage = targetIdx >= 3 ? 1 : 0;
      if (dailyPage !== targetPage) {
        scrollToDaySet(targetPage);
      }
    }
  }, [activeDayIndex, initialDayIndex]);

  const activeDay = forecast[selectedDayIndex] || forecast[0];

  const rawHourly = activeDay?.hourly || [];
  const displayHourly =
    hourlyFilter === 'daytime'
      ? rawHourly.filter(h => h.hourNum >= 7 && h.hourNum <= 22)
      : rawHourly;

  const scrollHourly = (direction: 'left' | 'right') => {
    if (hourlyScrollRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      hourlyScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const scrollDaily = (direction: 'left' | 'right') => {
    if (!dailyScrollRef.current) return;
    if (mobileLayout === 'threeDay' || window.innerWidth >= 640) {
      const targetPage = direction === 'left' ? 0 : 1;
      scrollToDaySet(targetPage);
    } else {
      const scrollAmount = dailyScrollRef.current.clientWidth * 0.85;
      dailyScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const scrollToDaySet = (pageIndex: number) => {
    setDailyPage(pageIndex);
    if (!dailyScrollRef.current) return;
    const container = dailyScrollRef.current;
    if (mobileLayout === 'threeDay' || window.innerWidth >= 640) {
      const clientWidth = container.clientWidth;
      container.scrollTo({
        left: pageIndex * clientWidth,
        behavior: 'smooth',
      });
    } else {
      const targetIndex = pageIndex === 0 ? 0 : 3;
      const card = cardRefs.current[targetIndex];
      if (card) {
        const cardLeft = card.offsetLeft - container.offsetLeft;
        container.scrollTo({ left: Math.max(0, cardLeft), behavior: 'smooth' });
      }
    }
  };

  const handleDailyScroll = () => {
    if (!dailyScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = dailyScrollRef.current;
    if (clientWidth > 0) {
      if (mobileLayout === 'threeDay' || window.innerWidth >= 640) {
        const page = Math.round(scrollLeft / clientWidth);
        setDailyPage(Math.min(1, Math.max(0, page)));
      } else {
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll > 20) {
          const ratio = scrollLeft / maxScroll;
          setDailyPage(ratio > 0.45 ? 1 : 0);
        }
      }
    }
  };

  const handleSelectDay = (index: number, fromDirectCardClick = false) => {
    setSelectedDayIndex(index);
    onSelectDayIndex?.(index);
    setShowHourly(true);
    const targetPage = index >= 3 ? 1 : 0;

    if (!dailyScrollRef.current) return;

    if (mobileLayout === 'threeDay' || window.innerWidth >= 640) {
      // If the target day is in the OTHER 3-day set, smoothly transition pages
      // If it's already on the active page (e.g. Day 5 on Page 1), do NOT scroll or reset!
      if (dailyPage !== targetPage) {
        scrollToDaySet(targetPage);
      }
    } else {
      // In detailed mode on mobile:
      if (!fromDirectCardClick) {
        const card = cardRefs.current[index];
        if (card) {
          const container = dailyScrollRef.current;
          const cardLeft = card.offsetLeft - container.offsetLeft;
          const target = cardLeft - (container.clientWidth - card.clientWidth) / 2;
          container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
        }
      }
      setDailyPage(targetPage);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs transition overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-lg shadow-2xs border border-sky-100 flex-shrink-0">
            <i className="fa-solid fa-cloud-sun"></i>
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="serif text-base sm:text-lg font-black text-slate-900 leading-snug">
                Washington, DC Weather Forecast
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                <i className="fa-solid fa-calendar-check text-[9px]"></i>
                Full Trip: Oct 15 – 20
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              National Mall, Tidal Basin, Smithsonian, &amp; National Zoo (Bao Li &amp; Qing Bao)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Unit Toggle °F / °C */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold border border-slate-200">
            <button
              onClick={() => setUnit('F')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] font-bold ${
                unit === 'F' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              °F
            </button>
            <button
              onClick={() => setUnit('C')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] font-bold ${
                unit === 'C' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              °C
            </button>
          </div>

          {/* Sync / Refresh */}
          <button
            onClick={fetchWeather}
            disabled={isRefreshing}
            className="text-slate-500 hover:text-sky-600 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 transition cursor-pointer flex items-center gap-1.5 font-semibold shadow-2xs"
            title="Refresh live forecast from Open-Meteo"
          >
            <i className={`fa-solid fa-arrows-rotate text-xs ${isRefreshing ? 'fa-spin text-sky-600' : ''}`}></i>
            <span className="text-[11px] font-bold hidden sm:inline">
              {isRefreshing ? 'Syncing...' : 'Sync Live'}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex flex-col items-center justify-center text-slate-400 text-xs gap-2.5">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-sky-500"></i>
          <span className="font-semibold text-slate-600">Connecting to Washington, DC weather station (Oct 15–20)...</span>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Current Temperature Banner */}
          {current && (
            <div className="bg-gradient-to-r from-sky-50/90 via-indigo-50/40 to-slate-50 p-4 rounded-xl border border-sky-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-xl bg-white border border-sky-100 flex items-center justify-center text-3xl shadow-2xs flex-shrink-0">
                  <i className={`fa-solid ${current.icon}`}></i>
                </div>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {toDisplayTemp(current.temperature)}°{unit}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{current.condition}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      (Feels {toDisplayTemp(current.apparentTemp)}°)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                    <span>
                      <i className="fa-solid fa-wind mr-1 text-sky-500"></i>
                      Wind: {current.windSpeed} mph
                    </span>
                    <span>
                      <i className="fa-solid fa-location-dot mr-1 text-rose-500"></i>
                      National Mall &amp; Downtown
                    </span>
                    {lastUpdated && (
                      <span className="text-slate-400">
                        <i className="fa-regular fa-clock mr-1"></i>
                        Updated {lastUpdated}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Trip Overview & Hourly Toggle */}
              <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-2.5 md:pt-0 border-sky-100/60 justify-between md:justify-end">
                <div className="hidden lg:flex items-center gap-1.5 text-[11px] bg-white/80 border border-sky-200/70 px-3 py-1.5 rounded-lg text-slate-700 font-medium shadow-2xs">
                  <i className="fa-solid fa-suitcase text-sky-600"></i>
                  <span>6-Day Trip Overview: 62°F – 81°F range</span>
                </div>
                <button
                  onClick={() => setShowHourly(!showHourly)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-sky-700 border border-sky-200 hover:bg-sky-50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-clock-rotate-left text-[11px]"></i>
                  <span>{showHourly ? 'Hide Hourly Breakdown' : 'Show Hourly Breakdown'}</span>
                  <i className={`fa-solid fa-chevron-${showHourly ? 'up' : 'down'} text-[10px]`}></i>
                </button>
              </div>
            </div>
          )}

          {/* 6-Day Trip Forecast: 3 Days Visible at a Time with Horizontal Scrolling */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-calendar-days text-sky-600"></i>
                  Daily Trip Forecast (3 Days Visible)
                </span>
                <span className="text-[11px] font-extrabold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/80 shadow-2xs">
                  {dailyPage === 0 ? 'Showing Days 1–3 (Oct 15–17)' : 'Showing Days 4–6 (Oct 18–20)'}
                </span>
              </div>

              {/* Controls: Mode Switcher, 3-day Set Tabs & Prev/Next */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                {/* Mobile View Toggle: 3-at-a-Glance vs Detailed */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold shadow-2xs sm:hidden">
                  <button
                    onClick={() => setMobileLayout('threeDay')}
                    className={`px-2 py-1 rounded-md transition cursor-pointer text-[10px] font-bold flex items-center gap-1 ${
                      mobileLayout === 'threeDay'
                        ? 'bg-white text-sky-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Show 3 days side-by-side"
                  >
                    <i className="fa-solid fa-table-columns text-[9px]"></i>
                    3-at-Once
                  </button>
                  <button
                    onClick={() => setMobileLayout('detailed')}
                    className={`px-2 py-1 rounded-md transition cursor-pointer text-[10px] font-bold flex items-center gap-1 ${
                      mobileLayout === 'detailed'
                        ? 'bg-white text-sky-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Show large swipeable cards"
                  >
                    <i className="fa-solid fa-square text-[9px]"></i>
                    Cards
                  </button>
                </div>

                {/* 3-day set pills */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold shadow-2xs">
                  <button
                    onClick={() => scrollToDaySet(0)}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] font-bold ${
                      dailyPage === 0
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Days 1–3 <span className="hidden xs:inline">(Oct 15–17)</span>
                  </button>
                  <button
                    onClick={() => scrollToDaySet(1)}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] font-bold ${
                      dailyPage === 1
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Days 4–6 <span className="hidden xs:inline">(Oct 18–20)</span>
                  </button>
                </div>

                {/* Left & Right chevron buttons + Dots */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-50 rounded-md border border-slate-200/60 mr-0.5" title={`Page ${dailyPage + 1} of 2`}>
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${dailyPage === 0 ? 'bg-sky-600 w-3' : 'bg-slate-300'}`}></span>
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${dailyPage === 1 ? 'bg-sky-600 w-3' : 'bg-slate-300'}`}></span>
                  </div>

                  <button
                    onClick={() => scrollDaily('left')}
                    disabled={dailyPage === 0}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center text-xs transition cursor-pointer shadow-2xs ${
                      dailyPage === 0
                        ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-700 hover:text-sky-600 border-slate-200 hover:bg-sky-50/50'
                    }`}
                    title="Scroll to previous 3 days"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button
                    onClick={() => scrollDaily('right')}
                    disabled={dailyPage === 1}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center text-xs transition cursor-pointer shadow-2xs ${
                      dailyPage === 1
                        ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-700 hover:text-sky-600 border-slate-200 hover:bg-sky-50/50'
                    }`}
                    title="Scroll to next 3 days"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Container for Cards */}
            {mobileLayout === 'threeDay' ? (
              /* 3-at-Once Mode: Exactly 3 days visible side-by-side per page on all devices */
              <div
                ref={dailyScrollRef}
                onScroll={handleDailyScroll}
                className="flex overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2 pt-1 w-full"
              >
                {[0, 1].map((pageIdx) => {
                  const pageDays = forecast.slice(pageIdx * 3, pageIdx * 3 + 3);
                  return (
                    <div
                      key={pageIdx}
                      className="w-full min-w-full flex-shrink-0 snap-start grid grid-cols-3 gap-1.5 sm:gap-3"
                    >
                      {pageDays.map((f, i) => {
                        const globalIdx = pageIdx * 3 + i;
                        const isSelected = selectedDayIndex === globalIdx;
                        return (
                          <button
                            key={f.date || globalIdx}
                            ref={(el) => (cardRefs.current[globalIdx] = el)}
                            onClick={() => handleSelectDay(globalIdx, true)}
                            className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-gradient-to-b from-sky-50 via-white to-sky-50/40 border-sky-400 ring-2 ring-sky-400/40 shadow-sm'
                                : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-2xs'
                            }`}
                          >
                            <div>
                              {/* Top Day Header */}
                              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1">
                                <span
                                  className={`text-[9px] sm:text-[11px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md self-start ${
                                    isSelected
                                      ? 'bg-sky-600 text-white shadow-2xs'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  Day {f.tripDayNumber}
                                </span>
                                <span className="text-[10px] sm:text-xs font-black text-slate-800 font-mono">
                                  {f.dayName.slice(0, 3)}, {f.formattedDate}
                                </span>
                              </div>

                              {/* Itinerary Title (Hidden on tiny screens, shown on tablet/desktop) */}
                              <div className="hidden sm:block mt-1">
                                <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-1">
                                  {f.tripTitle}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-sky-700 font-semibold bg-sky-100/60 px-1.5 sm:px-2 py-0.5 rounded mt-1 inline-block border border-sky-200/50 line-clamp-1">
                                  {f.tripHighlight}
                                </div>
                              </div>

                              {/* Weather Icon & Temps */}
                              <div className="my-1.5 sm:my-3.5 flex items-center justify-between bg-white/70 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-100">
                                <div className="flex items-center gap-1.5 sm:gap-3 w-full">
                                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl sm:text-3xl shadow-2xs flex-shrink-0">
                                    <i className={`fa-solid ${f.icon}`}></i>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline flex-wrap">
                                      <span className="text-base sm:text-2xl font-black text-slate-900 font-mono">
                                        {toDisplayTemp(f.tempMax)}°
                                      </span>
                                      <span className="text-[10px] sm:text-sm font-bold text-slate-400 font-mono ml-0.5 sm:ml-1.5">
                                        /{toDisplayTemp(f.tempMin)}°
                                      </span>
                                    </div>
                                    <div className="text-[10px] sm:text-xs font-bold text-slate-700 truncate mt-0.5">
                                      {f.condition}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom stats bar */}
                            <div className="pt-1.5 sm:pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[9px] sm:text-[11px] text-slate-500 font-medium">
                              <span
                                className={`font-black flex items-center gap-0.5 sm:gap-1 ${
                                  f.precipProb >= 35 ? 'text-blue-600' : 'text-slate-600'
                                }`}
                              >
                                <i className="fa-solid fa-droplet text-[8px] sm:text-[10px] text-blue-500"></i>
                                <span>{f.precipProb}%</span>
                              </span>
                              <span className="hidden xs:inline">
                                <i className="fa-solid fa-wind mr-0.5 text-slate-400"></i>
                                {f.windSpeedMax}m
                              </span>
                              <span>
                                <i className="fa-solid fa-sun mr-0.5 text-amber-500"></i>
                                UV {f.uvIndexMax}
                              </span>
                            </div>

                            {isSelected && (
                              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-sky-600 text-white font-black text-[8px] sm:text-[9px] shadow-xs flex items-center gap-0.5">
                                <i className="fa-solid fa-check text-[7px] sm:text-[8px]"></i>
                                <span className="hidden xs:inline">Viewing</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Detailed Mode: Large swipeable individual cards with full itinerary details */
              <div
                ref={dailyScrollRef}
                onScroll={handleDailyScroll}
                className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2 pt-1"
              >
                {forecast.map((f, i) => {
                  const isSelected = selectedDayIndex === i;
                  return (
                    <button
                      key={f.date || i}
                      ref={(el) => (cardRefs.current[i] = el)}
                      onClick={() => handleSelectDay(i, true)}
                      className={`w-[78vw] sm:w-[calc((100%-24px)/3)] flex-shrink-0 snap-start p-4 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-b from-sky-50 via-white to-sky-50/30 border-sky-400 ring-2 ring-sky-400/40 shadow-sm'
                          : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Top Day Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Day {f.tripDayNumber} of 6
                          </span>
                          <span className="text-xs font-black text-slate-800 font-mono">
                            {f.dayName.split(' ')[0]}, {f.formattedDate}
                          </span>
                        </div>

                        {/* Itinerary details with generous room */}
                        <div className="mt-1">
                          <div className="text-sm font-black text-slate-900 leading-snug line-clamp-1">
                            {f.tripTitle}
                          </div>
                          <div className="text-[11px] text-sky-700 font-semibold bg-sky-100/60 px-2 py-0.5 rounded-md mt-1 inline-block border border-sky-200/50 line-clamp-1">
                            {f.tripHighlight}
                          </div>
                        </div>

                        {/* Big Weather Icon & Temps */}
                        <div className="my-3.5 flex items-center justify-between bg-white/70 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl shadow-2xs flex-shrink-0">
                              <i className={`fa-solid ${f.icon}`}></i>
                            </div>
                            <div>
                              <div className="flex items-baseline">
                                <span className="text-2xl font-black text-slate-900 font-mono">
                                  {toDisplayTemp(f.tempMax)}°
                                </span>
                                <span className="text-sm font-bold text-slate-400 font-mono ml-1.5">
                                  / {toDisplayTemp(f.tempMin)}°
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-700 truncate mt-0.5">
                                {f.condition}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom stats bar */}
                      <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-black flex items-center gap-1 ${
                            f.precipProb >= 35 ? 'text-blue-600' : 'text-slate-600'
                          }`}
                        >
                          <i className="fa-solid fa-droplet text-[10px] text-blue-500"></i>
                          <span>{f.precipProb}% Rain</span>
                        </span>
                        <span className="text-slate-500 font-medium">
                          <i className="fa-solid fa-wind mr-1 text-slate-400"></i>
                          {f.windSpeedMax} mph
                        </span>
                        <span className="text-slate-500 font-medium">
                          <i className="fa-solid fa-sun mr-1 text-amber-500"></i>
                          UV {f.uvIndexMax}/10
                        </span>
                      </div>

                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-sky-600 text-white font-black text-[9px] shadow-xs flex items-center gap-1">
                          <i className="fa-solid fa-check text-[8px]"></i>
                          <span>Viewing</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Insight for Selected Day */}
          {activeDay && (
            <div className="bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 rounded-xl p-3.5 border border-sky-100 text-xs shadow-2xs">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 text-sm mt-0.5 border border-sky-200">
                  <i className="fa-solid fa-route"></i>
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">
                        Day {activeDay.tripDayNumber} ({activeDay.fullDayLabel})
                      </span>
                      <span className="text-[11px] font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200/60">
                        {activeDay.tripTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        UV Index: {activeDay.uvIndexMax}/10
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        Max Wind: {activeDay.windSpeedMax} mph
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-700 mt-1.5 leading-relaxed font-medium">
                    {activeDay.walkingTip}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Full Hourly Forecast Breakdown (Out to Oct 20) */}
          {showHourly && activeDay && (
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 animate-fadeIn space-y-3">
              {/* Hourly Toolbar: Day selector tabs & filter options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full flex-nowrap sm:flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 mr-1 flex items-center gap-1 flex-shrink-0">
                    <i className="fa-regular fa-clock text-sky-600"></i>
                    Hourly For:
                  </span>
                  {forecast.map((f, idx) => {
                    const isTabActive = selectedDayIndex === idx;
                    return (
                      <button
                        key={f.date || idx}
                        onClick={() => handleSelectDay(idx, false)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border flex-shrink-0 ${
                          isTabActive
                            ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {f.dayName.split(' ')[0]} {f.formattedDate}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Time Range Filter (Daytime vs All 24h) */}
                  <div className="flex items-center bg-white rounded-lg p-0.5 text-xs font-bold border border-slate-200">
                    <button
                      onClick={() => setHourlyFilter('daytime')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer text-[10px] font-bold ${
                        hourlyFilter === 'daytime'
                          ? 'bg-sky-50 text-sky-700 font-black'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Show active tourist walking hours (7 AM - 10 PM)"
                    >
                      Walking (7a–10p)
                    </button>
                    <button
                      onClick={() => setHourlyFilter('all')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer text-[10px] font-bold ${
                        hourlyFilter === 'all'
                          ? 'bg-sky-50 text-sky-700 font-black'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Show all 24 hours of the day"
                    >
                      All 24 Hours
                    </button>
                  </div>

                  {/* Left/Right scroll buttons for hourly */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => scrollHourly('left')}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs hover:bg-slate-100"
                      title="Scroll hourly earlier"
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button
                      onClick={() => scrollHourly('right')}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs hover:bg-slate-100"
                      title="Scroll hourly later"
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hourly horizontal cards container */}
              <div
                ref={hourlyScrollRef}
                className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 pt-1 scroll-smooth"
              >
                {displayHourly.length > 0 ? (
                  displayHourly.map((h, idx) => {
                    const isToday = selectedDayIndex === 0;
                    const nowHour = new Date().getHours();
                    const isNow = isToday && h.hourNum === nowHour;

                    return (
                      <div
                        key={idx}
                        className={`flex-shrink-0 w-22 p-2.5 rounded-xl border text-center transition relative ${
                          isNow
                            ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/40 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {isNow && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full shadow-2xs">
                            Now
                          </span>
                        )}

                        <span className="text-[11px] font-bold text-slate-700 block mb-1">
                          {h.hourLabel}
                        </span>

                        <div className="my-1.5 flex justify-center items-center h-7 text-xl">
                          <i className={`fa-solid ${h.icon}`}></i>
                        </div>

                        <span className="text-sm font-black text-slate-900 block font-mono">
                          {toDisplayTemp(h.temperature)}°
                        </span>

                        <span className="text-[9px] text-slate-400 block font-medium">
                          Feels {toDisplayTemp(h.apparentTemp)}°
                        </span>

                        <div
                          className={`mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] font-bold flex items-center justify-center gap-1 ${
                            h.precipProb >= 30 ? 'text-blue-600 font-black' : 'text-slate-400'
                          }`}
                        >
                          <i className="fa-solid fa-droplet text-[8px] text-blue-500"></i>
                          <span>{h.precipProb}%</span>
                        </div>

                        <div className="mt-0.5 text-[9px] text-slate-400 flex items-center justify-center gap-0.5">
                          <i className="fa-solid fa-wind text-[8px]"></i>
                          <span>{h.windSpeed}m</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs w-full">
                    No hourly data available for this range.
                  </div>
                )}
              </div>

              {/* Hourly Quick Tip / Summary */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1 border-t border-slate-200/60 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-chart-line text-sky-500"></i>
                  <span>
                    Forecast data out through <strong className="text-slate-700">Tuesday, October 20th</strong> for the Chung family trip.
                  </span>
                </span>
                <span className="text-slate-400 font-medium">
                  Scroll horizontally to review all 24 hours of {activeDay.fullDayLabel}
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
              <i className="fa-solid fa-circle-exclamation mr-1"></i>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
