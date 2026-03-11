import rawLocations from './indonesian-locations.json';

export interface City {
  name: string;
  type: 'Kota' | 'Kabupaten';
}

export interface Province {
  name: string;
  cities: City[];
}

export const indonesianLocations: Province[] = rawLocations as Province[];

export const getCityDisplayName = (city: City): string => `${city.type} ${city.name}`;

export const getAllProvinces = (): string[] =>
  indonesianLocations.map((province) => province.name);

export const getCitiesByProvince = (provinceName: string): City[] => {
  const province = indonesianLocations.find((item) => item.name === provinceName);
  return province ? province.cities : [];
};
