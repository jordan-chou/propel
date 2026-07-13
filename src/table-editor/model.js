export function buildCellGrid(table) {
    if (!table) return [];
    const grid = [];
    Array.from(table.querySelectorAll('tr')).forEach((row, rowIndex) => {
        Array.from(row.querySelectorAll(':scope > th, :scope > td')).forEach((cell, columnIndex) => {
            grid.push({ cell, row: rowIndex, column: columnIndex });
        });
    });
    return grid;
}

export function getCellPosition(table, cell) {
    return buildCellGrid(table).find(entry => entry.cell === cell) || null;
}

export function getCellsInRange(table, startCell, endCell) {
    const grid = buildCellGrid(table);
    const start = grid.find(entry => entry.cell === startCell);
    const end = grid.find(entry => entry.cell === endCell);
    if (!start || !end) return [];
    const [minRow, maxRow] = [Math.min(start.row, end.row), Math.max(start.row, end.row)];
    const [minColumn, maxColumn] = [Math.min(start.column, end.column), Math.max(start.column, end.column)];
    return grid.filter(entry => entry.row >= minRow && entry.row <= maxRow &&
        entry.column >= minColumn && entry.column <= maxColumn).map(entry => entry.cell);
}
