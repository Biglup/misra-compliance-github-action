import {fileURLToPath} from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let yPos = 125;
const LEFT_MARGIN = 75;
const REGULAR_FONT = path.join(__dirname, 'RobotoMono-Light.ttf');
const LINE_MARGIN = 15;

let initYPos = 100;
const maxRowsFirstPage = 35;
const maxRowsOtherPages = 40;
let currentPageRows = 0;
let pageIndex = 0;

export function addFileAnalyzed(doc, file, rowIndex) {
    doc.font(REGULAR_FONT).fontSize(10).text(file, LEFT_MARGIN + 5, yPos + 6);
    yPos += LINE_MARGIN;
    ++currentPageRows;

    if ((pageIndex === 0 && currentPageRows === maxRowsFirstPage) ||
        (pageIndex > 0 && currentPageRows === maxRowsOtherPages)) {
        doc.addPage();
        yPos = initYPos;
        currentPageRows = 0;
        pageIndex++;
    }
}