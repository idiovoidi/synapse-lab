/**
 * Spatial Grid for efficient collision detection
 * Divides 3D space into cells to avoid O(n*m) checks
 */
export class SpatialGrid {
  constructor(bounds, cellSize) {
    this.bounds = bounds; // { minX, maxX, minY, maxY, minZ, maxZ }
    this.cellSize = cellSize;

    // Calculate grid dimensions
    this.gridWidth = Math.ceil((bounds.maxX - bounds.minX) / cellSize);
    this.gridHeight = Math.ceil((bounds.maxY - bounds.minY) / cellSize);
    this.gridDepth = Math.ceil((bounds.maxZ - bounds.minZ) / cellSize);

    this.clear();
  }

  clear() {
    // Use Map for sparse grid (only store occupied cells)
    this.cells = new Map();
  }

  /**
   * Get cell key for a position
   */
  _getCellKey(x, y, z) {
    const cellX = Math.floor((x - this.bounds.minX) / this.cellSize);
    const cellY = Math.floor((y - this.bounds.minY) / this.cellSize);
    const cellZ = Math.floor((z - this.bounds.minZ) / this.cellSize);

    // Clamp to grid bounds
    const clampedX = Math.max(0, Math.min(this.gridWidth - 1, cellX));
    const clampedY = Math.max(0, Math.min(this.gridHeight - 1, cellY));
    const clampedZ = Math.max(0, Math.min(this.gridDepth - 1, cellZ));

    // Create unique key for cell
    return `${clampedX},${clampedY},${clampedZ}`;
  }

  /**
   * Insert an object into the grid
   */
  insert(object, position) {
    const key = this._getCellKey(position.x, position.y, position.z);

    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }

    this.cells.get(key).push(object);
  }

  /**
   * Get all objects within radius of a position
   * Only checks nearby cells instead of all objects
   */
  getNearby(position, radius) {
    const nearby = [];

    // Calculate which cells to check based on radius
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerKey = this._getCellKey(position.x, position.y, position.z);
    const [centerX, centerY, centerZ] = centerKey.split(",").map(Number);

    // Check all cells within cellRadius
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const checkX = centerX + dx;
          const checkY = centerY + dy;
          const checkZ = centerZ + dz;

          // Skip out of bounds cells
          if (
            checkX < 0 ||
            checkX >= this.gridWidth ||
            checkY < 0 ||
            checkY >= this.gridHeight ||
            checkZ < 0 ||
            checkZ >= this.gridDepth
          ) {
            continue;
          }

          const key = `${checkX},${checkY},${checkZ}`;
          const cellObjects = this.cells.get(key);

          if (cellObjects) {
            nearby.push(...cellObjects);
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Get statistics about grid usage
   */
  getStats() {
    const totalCells = this.gridWidth * this.gridHeight * this.gridDepth;
    const occupiedCells = this.cells.size;
    const totalObjects = Array.from(this.cells.values()).reduce(
      (sum, cell) => sum + cell.length,
      0
    );

    return {
      totalCells,
      occupiedCells,
      totalObjects,
      occupancyRate: ((occupiedCells / totalCells) * 100).toFixed(2) + "%",
      avgObjectsPerCell:
        occupiedCells > 0 ? (totalObjects / occupiedCells).toFixed(2) : 0,
    };
  }
}
