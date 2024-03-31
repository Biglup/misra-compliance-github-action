import {fileURLToPath} from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let yPos = 445;
const rowHeight = 25;
const tableWidth = 456;
const columnWidths = [114, 114, 114, 114];
const LEFT_MARGIN = 75;
const REGULAR_FONT = path.join(__dirname, 'RobotoMono-Light.ttf');
const LINE_WIDTH = 0.35;

let initYPos = 100;
const maxRowsFirstPage = 10;
const maxRowsOtherPages = 25;
let currentPageRows = 0;
let pageIndex = 0;

export function addTableHeaders(headers, doc, xPos, yPos, rowHeight, columnWidths) {
    doc.font(REGULAR_FONT);
    let xOffset = xPos;

    headers.forEach((header, index) => {
        doc.strokeColor("black").lineWidth(LINE_WIDTH).rect(xOffset, yPos, columnWidths[index], rowHeight).stroke();

        doc.text(header, xOffset, yPos, { width: columnWidths[index], align: 'center' });
        xOffset += columnWidths[index];
    });

    return yPos;
}

export function addResultTableRow(doc, rowData, rowIndex) {
    let xOffset = LEFT_MARGIN;

    if ((pageIndex === 0 && currentPageRows === maxRowsFirstPage) ||
        (pageIndex > 0 && currentPageRows === maxRowsOtherPages)) {
        doc.addPage();
        yPos = initYPos;
        currentPageRows = 0;
        pageIndex++;
    }

    if (rowIndex % 2 === 0) {
        doc.fillColor("#ffffff").rect(LEFT_MARGIN, yPos, tableWidth, rowHeight).fill();
    } else {
        doc.fillColor("#efefef").rect(LEFT_MARGIN, yPos, tableWidth, rowHeight).fill();
    }

    if (rowData.compliance === "NON-COMPLIANT" ) {
        doc.fillColor("#ea9999").rect(LEFT_MARGIN, yPos, tableWidth, rowHeight).fill();
    }

    if (rowData.compliance === "DEVIATION" ) {
        doc.fillColor("#fff2cc").rect(LEFT_MARGIN, yPos, tableWidth, rowHeight).fill();
    }

    doc.strokeColor("black").lineWidth(LINE_WIDTH).rect(LEFT_MARGIN, yPos, tableWidth, rowHeight).stroke()

    doc.fillColor('black');

    Object.values(rowData).forEach((text, i) => {
        doc.font(REGULAR_FONT).fontSize(10).text(text, xOffset + 5, yPos + 6, { width: columnWidths[i] - 4, align: 'left' });
        doc.strokeColor("black").lineWidth(LINE_WIDTH).rect(xOffset, yPos, columnWidths[i], rowHeight).stroke();

        xOffset += columnWidths[i];
    });
    yPos += rowHeight;
    ++currentPageRows;
}