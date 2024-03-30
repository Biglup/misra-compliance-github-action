export class RuleViolation {
    constructor(file, lineNumber, category, rationale, directive) {
        this._file = file;
        this._lineNumber = lineNumber;
        this._category = category;
        this._rationale = rationale;
        this._directive = directive;
    }

    file() {
        return this._file;
    };

    lineNumber() {
        return this._lineNumber;
    };

    category() {
        return this._category;
    };

    rationale() {
        return this._rationale;
    };

    directive() {
        return this._directive;
    };
}
