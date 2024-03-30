export class Rule {
    constructor(directive, category, rationale) {
        this._directive = directive;
        this._category = category;
        this._rationale = rationale;
    }

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
