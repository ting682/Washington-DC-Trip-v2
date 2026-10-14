import React, { useEffect, useState } from 'react';

interface HourlyForecast {
  time: string;
  hourLabel: string;
  temperature: number;
  apparentTemp: number;
  weatherCode: number;
  condition: string;
  icon: string;
  precipProb: number;
}

interface DayForecast {
  date: string;
  dayName: string;
  formattedDate: string;
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
}

interface CurrentWeather {
  temperature: number;
  apparentTemp: number;
  weatherCode: number;
  condition: string;
  icon: string;
  windSpeed: number;
  windDirection: number;
  humidity?: number;
}

export const WeatherCard: React.FC = () => {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [showHourly, setShowHourly] = useState<boolean>(false);
  const [unit, setUnit] = useState<'F' | 'C'>('F');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

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

  const getWalkingAdvice = (tempMax: number, precipProb: number, uv: number) => {
    if (precipProb >= 50) {
      return 'High rain likelihood: Ideal day for Smithsonian indoor galleries (Air & Space, Natural History). Bring compact umbrellas.';
    }
    if (precipProb >= 25) {
      return 'Scattered showers possible: Carry light waterproofs. Great for combining indoor museum exhibits and outdoor monuments.';
    }
    if (tempMax >= 82) {
      return 'Warm & sunny: Stay hydrated on the National Mall; plan outdoor Lincoln & WW2 memorials in the cooler morning or dusk.';
    }
    if (tempMax <= 48) {
      return 'Chilly breezes: Layer up with coats & scarves for open winds along the Tidal Basin and Capitol Hill.';
    }
    if (uv >= 6) {
      return 'High UV: Crisp blue skies. Wear sun hats and sunscreen while walking between the Washington Monument and White House.';
    }
    return 'Comfortable walking weather: Perfect conditions for walking the National Mall paths, sculpture gardens, and Wharf boardwalks.';
  };

  const fetchWeather = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      // Washington DC coordinates: 38.8951, -77.0364
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=38.8951&longitude=-77.0364&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,windspeed_10m_max,uv_index_max&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York';

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather fetch status: ${res.status}`);
      const data = await res.json();

      if (data && data.current_weather && data.daily) {
        const curCode = data.current_weather.weathercode;
        const curInfo = getWeatherInfo(curCode);

        // Compute current apparent temp if hourly matches
        let curApparent = Math.round(data.current_weather.temperature);
        if (data.hourly && data.hourly.time && data.hourly.apparent_temperature) {
          const nowStr = data.current_weather.time; // e.g. "2026-10-14T08:00"
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

        // 3-day forecast
        const dailyList: DayForecast[] = [];
        const dates: string[] = data.daily.time || [];
        const maxTemps: number[] = data.daily.temperature_2m_max || [];
        const minTemps: number[] = data.daily.temperature_2m_min || [];
        const appMax: number[] = data.daily.apparent_temperature_max || [];
        const appMin: number[] = data.daily.apparent_temperature_min || [];
        const codes: number[] = data.daily.weathercode || [];
        const precips: number[] = data.daily.precipitation_probability_max || [];
        const winds: number[] = data.daily.windspeed_10m_max || [];
        const uvs: number[] = data.daily.uv_index_max || [];

        const count = Math.min(3, dates.length);
        for (let i = 0; i < count; i++) {
          const dateStr = dates[i];
          const dateObj = new Date(dateStr + 'T12:00:00');
          const dayName =
            i === 0
              ? 'Today'
              : i === 1
              ? 'Tomorrow'
              : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

          const formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          const info = getWeatherInfo(codes[i]);
          const pProb = Math.round(precips[i] || 0);
          const tMax = Math.round(maxTemps[i] || 65);
          const uvVal = Math.round(uvs[i] || 4);

          dailyList.push({
            date: dateStr,
            dayName,
            formattedDate,
            weatherCode: codes[i],
            condition: info.condition,
            icon: info.icon,
            tempMax: tMax,
            tempMin: Math.round(minTemps[i] || 50),
            apparentMax: Math.round(appMax[i] || tMax),
            apparentMin: Math.round(appMin[i] || 50),
            precipProb: pProb,
            windSpeedMax: Math.round(winds[i] || 10),
            uvIndexMax: uvVal,
            walkingTip: getWalkingAdvice(tMax, pProb, uvVal),
          });
        }

        setForecast(dailyList);

        // Hourly slice for today (next 12 hours or daytime hours 8am - 10pm)
        if (data.hourly && data.hourly.time) {
          const hourlyList: HourlyForecast[] = [];
          const nowHourStr = data.current_weather.time.slice(0, 13);
          let startIdx = data.hourly.time.findIndex((t: string) => t.startsWith(nowHourStr));
          if (startIdx < 0) startIdx = 0;

          const hCount = Math.min(8, data.hourly.time.length - startIdx);
          for (let h = 0; h < hCount; h++) {
            const idx = startIdx + h;
            const tStr = data.hourly.time[idx];
            const dateH = new Date(tStr);
            const hourLabel = dateH.toLocaleTimeString('en-US', {
              hour: 'numeric',
              hour12: true,
            });
            const hCode = data.hourly.weathercode[idx];
            const hInfo = getWeatherInfo(hCode);

            hourlyList.push({
              time: tStr,
              hourLabel,
              temperature: Math.round(data.hourly.temperature_2m[idx]),
              apparentTemp: Math.round(data.hourly.apparent_temperature[idx]),
              weatherCode: hCode,
              condition: hInfo.condition,
              icon: hInfo.icon,
              precipProb: Math.round(data.hourly.precipitation_probability[idx] || 0),
            });
          }
          setHourly(hourlyList);
        }

        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        );
      }
    } catch (err: any) {
      console.warn('Weather fetch error, using fallback:', err);
      setError('Live forecast unavailable. Showing seasonal DC travel forecast.');

      // Fallback DC Autumn forecast
      setCurrent({
        temperature: 66,
        apparentTemp: 64,
        weatherCode: 1,
        condition: 'Sunny & Pleasant',
        icon: 'fa-sun text-amber-500',
        windSpeed: 8,
        windDirection: 180,
      });

      setForecast([
        {
          date: 'Day 1',
          dayName: 'Today',
          formattedDate: 'Today',
          weatherCode: 1,
          condition: 'Sunny & Pleasant',
          icon: 'fa-sun text-amber-500',
          tempMax: 68,
          tempMin: 50,
          apparentMax: 67,
          apparentMin: 48,
          precipProb: 10,
          windSpeedMax: 9,
          uvIndexMax: 5,
          walkingTip: 'Crisp & sunny: Excellent walking conditions along the National Mall and Tidal Basin.',
        },
        {
          date: 'Day 2',
          dayName: 'Tomorrow',
          formattedDate: 'Tomorrow',
          weatherCode: 2,
          condition: 'Partly Cloudy',
          icon: 'fa-cloud-sun text-sky-500',
          tempMax: 65,
          tempMin: 48,
          apparentMax: 64,
          apparentMin: 46,
          precipProb: 20,
          windSpeedMax: 11,
          uvIndexMax: 4,
          walkingTip: 'Mild afternoon: Great for Capitol Hill and Smithsonian museums.',
        },
        {
          date: 'Day 3',
          dayName: 'Day 3',
          formattedDate: 'Day 3',
          weatherCode: 0,
          condition: 'Clear Blue Skies',
          icon: 'fa-sun text-amber-500',
          tempMax: 69,
          tempMin: 52,
          apparentMax: 68,
          apparentMin: 50,
          precipProb: 5,
          windSpeedMax: 7,
          uvIndexMax: 5,
          walkingTip: 'Bright sunshine: Perfect for outdoor monuments and waterfront dinner at The Wharf.',
        },
      ]);

      setHourly([
        { time: '1', hourLabel: '9 AM', temperature: 56, apparentTemp: 55, weatherCode: 1, condition: 'Sunny', icon: 'fa-sun text-amber-500', precipProb: 0 },
        { time: '2', hourLabel: '12 PM', temperature: 65, apparentTemp: 65, weatherCode: 1, condition: 'Sunny', icon: 'fa-sun text-amber-500', precipProb: 5 },
        { time: '3', hourLabel: '3 PM', temperature: 68, apparentTemp: 67, weatherCode: 2, condition: 'Partly Cloudy', icon: 'fa-cloud-sun text-sky-500', precipProb: 10 },
        { time: '4', hourLabel: '6 PM', temperature: 62, apparentTemp: 60, weatherCode: 1, condition: 'Clear', icon: 'fa-sun text-amber-500', precipProb: 5 },
        { time: '5', hourLabel: '9 PM', temperature: 54, apparentTemp: 53, weatherCode: 0, condition: 'Clear', icon: 'fa-moon text-indigo-400', precipProb: 0 },
      ]);

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
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeDay = forecast[selectedDayIndex] || forecast[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs transition overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-base shadow-2xs border border-sky-100">
            <i className="fa-solid fa-cloud-sun"></i>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="serif text-base font-black text-slate-900 leading-snug">
                Washington, DC Weather
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                Live 3-Day Forecast
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              National Mall, Tidal Basin &amp; Downtown DC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Unit Toggle °F / °C */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
            <button
              onClick={() => setUnit('F')}
              className={`px-2 py-1 rounded-md transition cursor-pointer text-[11px] ${
                unit === 'F' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              °F
            </button>
            <button
              onClick={() => setUnit('C')}
              className={`px-2 py-1 rounded-md transition cursor-pointer text-[11px] ${
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
            className="text-slate-400 hover:text-sky-600 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 transition cursor-pointer flex items-center gap-1.5 font-semibold"
            title="Refresh forecast from Open-Meteo"
          >
            <i className={`fa-solid fa-arrows-rotate text-xs ${isRefreshing ? 'fa-spin text-sky-600' : ''}`}></i>
            <span className="text-[11px] hidden sm:inline">
              {isRefreshing ? 'Updating...' : 'Sync'}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2.5">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-sky-500"></i>
          <span className="font-medium">Connecting to Washington, DC weather station...</span>
        </div>
      ) : (
        <div className="mt-3.5 space-y-3">
          {/* Current Temperature Banner */}
          {current && (
            <div className="bg-gradient-to-r from-sky-50/90 via-indigo-50/40 to-slate-50 p-3.5 rounded-xl border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/80 border border-sky-100 flex items-center justify-center text-3xl shadow-2xs">
                  <i className={`fa-solid ${current.icon}`}></i>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {toDisplayTemp(current.temperature)}°{unit}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{current.condition}</span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      (Feels {toDisplayTemp(current.apparentTemp)}°)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 mt-0.5">
                    <span>
                      <i className="fa-solid fa-wind mr-1 text-slate-400"></i>
                      Wind: {current.windSpeed} mph
                    </span>
                    <span>
                      <i className="fa-solid fa-location-arrow mr-1 text-slate-400"></i>
                      Mall breezes
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

              {/* Walking recommendation pill */}
              <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-sky-100/60">
                <button
                  onClick={() => setShowHourly(!showHourly)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white text-sky-700 border border-sky-200 hover:bg-sky-50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
                  <span>{showHourly ? 'Hide Hourly' : 'Today\'s Hourly'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Today's Hourly Timeline (collapsible) */}
          {showHourly && hourly.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 animate-fadeIn">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>Today's Walking Timeline (DC Local Time)</span>
                <span className="text-[9px] text-slate-400">Next 8 Hours</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {hourly.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-20 bg-white p-2 rounded-lg border border-slate-200 text-center shadow-2xs"
                  >
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      {h.hourLabel}
                    </span>
                    <i className={`fa-solid ${h.icon} text-lg my-1`}></i>
                    <span className="text-xs font-black text-slate-900 block font-mono">
                      {toDisplayTemp(h.temperature)}°
                    </span>
                    <div className="mt-1 text-[9px] text-blue-600 font-semibold flex items-center justify-center gap-0.5">
                      <i className="fa-solid fa-droplet text-[8px]"></i>
                      <span>{h.precipProb}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3-Day Forecast Cards */}
          <div className="grid grid-cols-3 gap-2">
            {forecast.map((f, i) => {
              const isSelected = selectedDayIndex === i;
              return (
                <button
                  key={f.date || i}
                  onClick={() => setSelectedDayIndex(i)}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/30 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {f.dayName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {f.formattedDate}
                    </span>
                  </div>

                  <div className="my-1.5 flex justify-center items-center h-8 text-2xl">
                    <i className={`fa-solid ${f.icon}`}></i>
                  </div>

                  <div className="text-sm font-black text-slate-900 font-mono">
                    {toDisplayTemp(f.tempMax)}° /{' '}
                    <span className="text-slate-400 font-semibold">
                      {toDisplayTemp(f.tempMin)}°
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 mt-0.5 truncate font-medium">
                    {f.condition}
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-blue-600 flex items-center gap-0.5">
                      <i className="fa-solid fa-droplet text-[9px]"></i>
                      <span>{f.precipProb}%</span>
                    </span>
                    <span className="text-slate-400 font-medium">
                      <i className="fa-solid fa-wind mr-0.5"></i>
                      {f.windSpeedMax}m
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Insight for Selected Day */}
          {activeDay && (
            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                  <i className="fa-solid fa-lightbulb"></i>
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Trip Advice for {activeDay.dayName} ({activeDay.formattedDate})
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      UV Index: {activeDay.uvIndexMax}/10
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {activeDay.walkingTip}
                  </p>
                </div>
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
