import { fetchMapTile, validTileCoordinates } from '../../services/mapTiles.js';
import { httpError } from '../utils/httpErrors.js';

export const getMapTiles = async (req, res) => {
  const values = [req.params.z, req.params.x, req.params.y];
  if (values.some(value => !/^\d{1,7}$/.test(String(value)))) throw httpError(400, 'INVALID_TILE', 'Некорректные координаты тайла');
  const [z, x, y] = values.map(Number);
  if (!validTileCoordinates(z, x, y)) throw httpError(400, 'INVALID_TILE', 'Некорректные координаты тайла');
  const tile = await fetchMapTile(z, x, y);
  res.setHeader('Content-Type', tile.contentType);
  res.setHeader('Content-Length', String(tile.body.length));
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(tile.body);
};
