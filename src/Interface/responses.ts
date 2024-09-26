import { RowDataPacket } from "mysql2/promise";

export interface UniqueFlight {
    origin_iata_code:      string;
    origin_name:           string;
    destination_iata_code: string;
    destination_name:      string;

}
export interface ApiResponse<T> {
    page:    number;
    limit:   number;
    total:   number;
    items:   T[]; 
  }


export interface Flights extends RowDataPacket {
    id:                    number;
    origin:                string;
    destination:           string;
    airline:               string;
    flight_num:            number;
    origin_iata_code:      string;
    origin_name:           string;
    origin_latitude:       number;
    origin_longitude:      number;
    destination_iata_code: string;
    destination_name:      string;
    destination_latitude:  number;
    destination_longitude: number;
    originWeather:         NWeather;
    destinationWeather:    NWeather;
}


export interface NWeather {
    coord:      Coord;
    weather:    Weather[];
    base:       string;
    main:       MainClass;
    visibility: number;
    wind:       Wind;
    clouds:     Clouds;
    dt:         number;
    sys:        Sys;
    timezone:   number;
    id:         number;
    name:       string;
    cod:        number;
}


export interface Clouds {
    all: number;
}

export interface Coord {
    lon: number;
    lat: number;
}

export interface MainClass {
    temp:       number;
    feels_like: number;
    temp_min:   number;
    temp_max:   number;
    pressure:   number;
    humidity:   number;
    sea_level:  number;
    grnd_level: number;
}

export interface Sys {
    type:    number;
    id:      number;
    country: string;
    sunrise: number;
    sunset:  number;
}

export interface Weather {
    id:          number;
    main:        string;
    description: string;
    icon:        string;
}

export interface Wind {
    speed: number;
    deg:   number;
}


export interface FlightRecord {
    id:                    number;
    origin:                string;
    destination:           string;
    airline:               string;
    flight_num:            number;
    origin_iata_code:      string;
    origin_name:           string;
    origin_latitude:       string;
    origin_longitude:      string;
    destination_iata_code: string;
    destination_name:      string;
    destination_latitude:  string;
    destination_longitude: string;
}

export interface FlightWithWeather extends FlightRecord {
    originWeather: NWeather | null;
    destinationWeather: NWeather | null;
}


export interface UniqueCoordinate {
    latitude: number;
    longitude: number;
    location_code: string;
    location_name: string;
}

// Elimina 'extends RowDataPacket'
export interface Coordinate {
    latitude: number;
    longitude: number;
    location_code: string;
    location_name: string;
  }
  