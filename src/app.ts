import express, { Request, Response } from 'express';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
const cors = require('cors');
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import { ApiResponse, Coordinate, Flights, NWeather } from './Interface/responses';

dotenv.config();

const app = express();
const port = 3000;

const dbConfig = {
  host: process.env.DB_HOST,
  port: 14900,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool(dbConfig);

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());

const cache = new NodeCache({ stdTTL: 3600 });

const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200,
});

app.get('/', (req, res) => {
  res.send('Ruta Inicial Ok');
});

app.get('/api/flights/getWeatherReport', async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '10' } = req.query;
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(pageSize as string, 10);

    if (isNaN(parsedPage) || isNaN(parsedLimit) || parsedPage < 1 || parsedLimit < 1) {
      return res.status(400).json({ error: 'Parámetros de página o límite inválidos' });
    }

    const offset = (parsedPage - 1) * parsedLimit;

    // Obtener el número total de vuelos
    const [countResult] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM flights');
    const total = countResult[0].total;

    // Obtener los vuelos paginados
    const [flights] = await pool.query<Flights[]>(
      'SELECT * FROM flights LIMIT ? OFFSET ?',
      [parsedLimit, offset]
    );

    // Extraer coordenadas únicas de los vuelos paginados
    const coordsSet = new Set<string>();
    const coordsList: Coordinate[] = [];

    flights.forEach(flight => {
      const originKey = `${flight.origin_latitude}_${flight.origin_longitude}`;
      const destinationKey = `${flight.destination_latitude}_${flight.destination_longitude}`;

      if (!coordsSet.has(originKey)) {
        coordsSet.add(originKey);
        coordsList.push({
          latitude: (flight.origin_latitude),
          longitude: (flight.origin_longitude),
          location_code: flight.origin_iata_code,
          location_name: flight.origin_name,
        });
      }

      if (!coordsSet.has(destinationKey)) {
        coordsSet.add(destinationKey);
        coordsList.push({
          latitude: (flight.destination_latitude),
          longitude: (flight.destination_longitude),
          location_code: flight.destination_iata_code,
          location_name: flight.destination_name,
        });
      }
    });

    // Obtener datos meteorológicos solo para las coordenadas de la página actual
    const weatherPromises = coordsList.map(coord =>
      fetchWeatherWithCache(coord.latitude, coord.longitude)
    );
    const weatherDataArray = await Promise.all(weatherPromises);

    // Mapear coordenadas a datos meteorológicos
    const weatherDataMap: { [key: string]: NWeather } = {};
    coordsList.forEach((coord, index) => {
      const cacheKey = `${coord.latitude}_${coord.longitude}`;
      weatherDataMap[cacheKey] = weatherDataArray[index];
    });

    // agregar a los vuelos los datos meteorológicos
    const enrichedFlights = flights.map(flight => {
      const originKey = `${flight.origin_latitude}_${flight.origin_longitude}`;
      const destinationKey = `${flight.destination_latitude}_${flight.destination_longitude}`;

      return {
        ...flight,
        originWeather: weatherDataMap[originKey],
        destinationWeather: weatherDataMap[destinationKey],
      };
    });

    // Devolver la respuesta
    const response: ApiResponse<Flights> = {
      page: parsedPage,
      limit: parsedLimit,
      total,
      items: enrichedFlights,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error al procesar el informe meteorológico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



const fetchWeatherWithCache = async (latitude: number, longitude: number): Promise<NWeather> => {
  const cacheKey = `${latitude}_${longitude}`;
  const cachedWeather = cache.get<NWeather>(cacheKey);
  if (cachedWeather) {
    return cachedWeather;
  }

  const apiUrl = `${process.env.WEATHER_API_URL}?lat=${latitude}&lon=${longitude}&appid=${process.env.WEATHER_API_KEY}&units=metric&lang=es`;
  try {
    const response = await limiter.schedule(() => axios.get<NWeather>(apiUrl));
    const weatherData = response.data;
    cache.set(cacheKey, weatherData);
    return weatherData;
  } catch (error) {
    console.error(`Error fetching weather for ${latitude}, ${longitude}:`, error);
    throw error;
  }
};

app.post('/api/cache/clear', (req: Request, res: Response) => {
  cache.flushAll();
  res.status(200).json({ message: 'Cache cleared successfully' });
});

app.listen(port, () => {
  console.log(`Weather API listening at http://localhost:${port}`);
});
