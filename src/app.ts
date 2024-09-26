import express, { Request, Response } from 'express';
import axios from 'axios';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool(dbConfig);

app.use(express.json());

app.get('/api/flights/getWeatherReport', async (req: Request, res: Response) => {
  try {
    const [flights, fields]: [any[], any[]] = await pool.query('SELECT * FROM flights LIMIT 10');

    const weatherData: any[] = [];
    
    for (const flight of flights) {
      const apiUrl = `${process.env.WEATHER_API_URL}?lat=${flight.origin_latitude}&lon=${flight.origin_longitude}&appid=${process.env.WEATHER_API_KEY}&units=metric&lang=es`;
      const response = await axios.get(apiUrl);
      weatherData.push({
        flight,
        weather: response.data,
      });
    }

    res.status(200).json({ data: weatherData });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
