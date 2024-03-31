import {fileURLToPath} from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let yPos = 235;
const tableWidth = 456;
const columnWidths = [132, 102, 222];
const LEFT_MARGIN = 75;
const REGULAR_FONT = path.join(__dirname, 'RobotoMono-Light.ttf');
const LINE_WIDTH = 0.35;
const TITLE_FONT_SIZE = 19;
const CONTENT_FONT_SIZE = 10;
const LINE_MARGIN = 15;

let initYPos = 100;
const maxRowsFirstPage = 1;
const maxRowsOtherPages = 3;
let currentPageRows = 0;
let pageIndex = 0;

export function addSuppressionTableHeaders(headers, doc, xPos, yPos, rowHeight, columnWidths) {
    doc.font(REGULAR_FONT);
    let xOffset = xPos;

    headers.forEach((header, index) => {
        doc.strokeColor("black").lineWidth(LINE_WIDTH).rect(xOffset, yPos, columnWidths[index], rowHeight).stroke();

        doc.text(header, xOffset, yPos, { width: columnWidths[index], align: 'center' });
        xOffset += columnWidths[index];
    });

    return yPos;
}

export function addSuppresionsTableRow(doc, rowData, rowIndex) {
    let xOffset = LEFT_MARGIN;

    if ((pageIndex === 0 && currentPageRows === maxRowsFirstPage) ||
        (pageIndex > 0 && currentPageRows === maxRowsOtherPages)) {
        doc.addPage();
        yPos = initYPos;
        currentPageRows = 0;
        pageIndex++;
    }

    if (rowIndex % 2 === 0) {
        doc.fillColor("#ffffff").rect(LEFT_MARGIN, yPos, tableWidth, rowData[3]).fill();
    } else {
        doc.fillColor("#efefef").rect(LEFT_MARGIN, yPos, tableWidth, rowData[3]).fill();
    }

    doc.strokeColor("black").lineWidth(LINE_WIDTH).rect(LEFT_MARGIN, yPos, tableWidth, rowData[3]).stroke()

    doc.fillColor('black');

    Object.values(rowData).forEach((text, i) => {
        if (i > 2) return;
        doc.font(REGULAR_FONT).fontSize(10).text(text, xOffset + 5, yPos + 6, { width: columnWidths[i] - 4, align: 'left' });

        doc.strokeColor("black").lineWidth(LINE_WIDTH).rect(xOffset, yPos, columnWidths[i], rowData[3]).stroke();

        xOffset += columnWidths[i];
    });
    yPos += rowData[3];
    ++currentPageRows;
}

export function renderDeviations(doc) {
    // TODO: Deviations are hardcoded, read this from repository.
    // Render Deviations
    doc.font(REGULAR_FONT)
        .fontSize(TITLE_FONT_SIZE)
        .text('Deviations', LEFT_MARGIN, 100);

    doc.font(REGULAR_FONT)
        .fontSize(CONTENT_FONT_SIZE)
        .text('MISRA allows deviations from guidelines in situations where those guidelines might be impractical or unreasonable to follow. All such deviations must be documented and authorized. The documentation should include the guideline, situation, rationale for deviation, and risk analysis.\n', LEFT_MARGIN, 150);

    const suppressionHeaders = ['Rule', 'Category', 'Rationale for Skipping'];
    const suppressionData = [
        ['Directive 11.5: A Conversion Should Not Be Performed from Pointer to void into Pointer to Object', 'Advisory', 'In our project, conversions from void* to specific object pointers are utilized in the context of generic data handling functions and callback mechanisms. This approach is central to implementing polymorphism in C, allowing us to write modular, reusable code that operates on various data types. Each conversion is carefully controlled and validated to ensure type correctness and safety. The use of void* pointers is confined to specific, well-documented interfaces where the actual data type is known and checked before dereferencing. This strategy allows for the flexibility required by our design patterns while mitigating the risks typically associated with such conversions. Type safety is ensured through rigorous testing and code reviews focused on these critical sections of the codebase.', 335],
        ['Directive  15.5: A function should have a single point of exit at the end', 'Advisory', 'Early returns can reduce the need for nested conditional statements, making the code more straightforward to read. The intent behind using an early return is to handle edge cases or preconditions at the beginning of the function, allowing the main function logic to remain unindented and clear.', 130],
        ['Directive  21.3: The memory allocation and deallocation functions of <stdlib.h> shall not be used', 'Required', 'The nature of our software library requires managing a dynamic and potentially large number of objects. Users have the flexibility to create objects at runtime, and the exact number cannot be determined beforehand. Static allocation or using fixed-sized memory pools would restrict the functionality and limit the library\'s utility. Clear documentation instructs users on proper object lifecycle management, emphasizing the importance of deallocating objects when they are no longer needed.', 225],
        ['Directive  21.6: The Standard Library input/output functions shall not be used', 'Style', 'The use of standard library input/output functions, specifically snprintf, is deemed necessary for dynamic error message formatting within the library. This functionality is critical for providing meaningful runtime diagnostics and cannot be efficiently replicated with static error messages or significantly simplified error reporting mechanisms. The implementation confines the use of snprintf to controlled environments where buffer sizes are strictly managed, and format string contents are known and verified.', 240],
    ];

    addSuppressionTableHeaders(suppressionHeaders, doc, LEFT_MARGIN, 220, LINE_MARGIN, [132, 102, 222]);
    suppressionData.forEach((row, index) => addSuppresionsTableRow(doc, row, index));
}