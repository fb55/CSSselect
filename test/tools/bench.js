const ben = require("ben");
const testString =
    'doo, *#foo > elem.bar[class$=bAz i]:not([ id *= "2" ]):nth-child(2n)';
const helper = require("./helper");
const CSSselect = require("../../src");
const dom = helper.getDefaultDom();

// console.log("Parsing took:", ben(1e5, function(){compile(testString);}));
const compiled = CSSselect.compile(testString);
console.log(
    "Executing took:",
    ben(1e6, () => CSSselect.selectAll(compiled, dom)) * 1e3
);
