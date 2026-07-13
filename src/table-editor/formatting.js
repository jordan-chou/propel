export function isCellBold(cell) {
    if (!cell) {
        return false;
    }

    if (cell.tagName.toLowerCase() === 'th') {
        return !cell.classList.contains('fnt-nrml');
    }

    return Boolean(cell.children.length === 1
        && cell.firstElementChild
        && cell.firstElementChild.tagName.toLowerCase() === 'strong');
}

export function setCellBold(cell, shouldBeBold) {
    if (!cell) {
        return;
    }

    if (cell.tagName.toLowerCase() === 'th') {
        cell.classList.toggle('fnt-nrml', !shouldBeBold);
        return;
    }

    const strong = isCellBold(cell) ? cell.firstElementChild : null;

    if (!shouldBeBold && strong) {
        while (strong.firstChild) {
            cell.insertBefore(strong.firstChild, strong);
        }
        strong.remove();
        cell.classList.add('fnt-nrml');
        return;
    }

    if (!shouldBeBold || strong) {
        return;
    }

    const wrapper = document.createElement('strong');
    while (cell.firstChild) {
        wrapper.appendChild(cell.firstChild);
    }
    cell.appendChild(wrapper);
    cell.classList.remove('fnt-nrml');
}

export function toggleCellBold(cell) {
    setCellBold(cell, !isCellBold(cell));
}

export function toggleCellsBold(cells) {
    const selectedCells = Array.from(cells || []);
    const shouldBeBold = !selectedCells.every(isCellBold);

    selectedCells.forEach((cell) => setCellBold(cell, shouldBeBold));
}
