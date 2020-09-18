/*
	taken from https://github.com/dperini/nwmatcher/blob/master/test/scotch/test.js
*/

const { DomUtils } = require("htmlparser2");
const helper = require("../tools/helper.js");
const assert = require("assert");
const path = require("path");
const decircularize = require("../decircularize");
const document = helper.getDocument(path.join(__dirname, "test.html"));
const CSSselect = require("../../src");

// Prototype's `$` function
function getById(element) {
    if (arguments.length === 1) {
        if (typeof element === "string") {
            return DomUtils.getElementById(element, document);
        }
        return element;
    } 
        return Array.prototype.map.call(arguments, (elem) => getById(elem));
    
}

// NWMatcher methods
const select = (query, doc = document) =>
    CSSselect.selectAll(query, typeof doc === "string" ? select(doc) : doc);
const match = CSSselect.is;

const validators = {
    assert,
    assertEqual: assert.strictEqual,
    assertEquivalent(v1, v2, message) {
        return assert.deepStrictEqual(decircularize(v1), decircularize(v2), message);
    },
    refute: function refute(a, msg) {
        assert(!a, msg);
    },
    assertThrowsException() {}, // not implemented
};

const runner = {
    __name: "",
    addGroup(name) {
        this.__name = name;
        return this;
    },
    addTests(_, tests) {
        if (this.__name) {
            describe(this.__name, run);
            this.__name = "";
        } else run();

        function run() {
            for (const name of Object.keys(tests)){
                it(name, () => {
                    tests[name].call(validators);
                });
            };
        }
    },
};

const RUN_BENCHMARKS = false;
// The tests...
(function (runner) {
    runner.addGroup("Basic Selectors").addTests(null, {
        "*"() {
            // Universal selector
            const results = [];
            const nodes = document.getElementsByTagName("*");
            let index = 0;
            const { length } = nodes;
            let node;
            // Collect all element nodes, excluding comments (IE)
            for (; index < length; index++) {
                if ((node = nodes[index]).tagName !== "!") {
                    results[results.length] = node;
                }
            }
            this.assertEquivalent(
                select("*"),
                results,
                "Comment nodes should be ignored."
            );
        },
        E() {
            // Type selector
            const results = [];
            let index = 0;
            const nodes = document.getElementsByTagName("li");
            while ((results[index] = nodes[index++]));
            results.length--;
            //  this.assertEquivalent(select("li"), results); //TODO
            this.assertEqual(
                select("strong", getById("fixtures"))[0],
                getById("strong")
            );
            this.assertEquivalent(select("nonexistent"), []);
        },
        "#id"() {
            // ID selector
            this.assertEqual(select("#fixtures")[0], getById("fixtures"));
            this.assertEquivalent(select("nonexistent"), []);
            this.assertEqual(select("#troubleForm")[0], getById("troubleForm"));
        },
        ".class"() {
            // Class selector
            this.assertEquivalent(
                select(".first"),
                getById("p", "link_1", "item_1")
            );
            this.assertEquivalent(select(".second"), []);
        },
        "E#id"() {
            this.assertEqual(select("strong#strong")[0], getById("strong"));
            this.assertEquivalent(select("p#strong"), []);
        },
        "E.class"() {
            const secondLink = getById("link_2");
            this.assertEquivalent(
                select("a.internal"),
                getById("link_1", "link_2")
            );
            this.assertEqual(select("a.internal.highlight")[0], secondLink);
            this.assertEqual(select("a.highlight.internal")[0], secondLink);
            this.assertEquivalent(
                select("a.highlight.internal.nonexistent"),
                []
            );
        },
        "#id.class"() {
            const secondLink = getById("link_2");
            this.assertEqual(select("#link_2.internal")[0], secondLink);
            this.assertEqual(select(".internal#link_2")[0], secondLink);
            this.assertEqual(
                select("#link_2.internal.highlight")[0],
                secondLink
            );
            this.assertEquivalent(select("#link_2.internal.nonexistent"), []);
        },
        "E#id.class"() {
            const secondLink = getById("link_2");
            this.assertEqual(select("a#link_2.internal")[0], secondLink);
            this.assertEqual(select("a.internal#link_2")[0], secondLink);
            this.assertEqual(select("li#item_1.first")[0], getById("item_1"));
            this.assertEquivalent(select("li#item_1.nonexistent"), []);
            this.assertEquivalent(select("li#item_1.first.nonexistent"), []);
        },
    });

    runner.addGroup("Attribute Selectors").addTests(null, {
        "[foo]"() {
            this.assertEquivalent(
                select("[href]", document.body),
                select("a[href]", document.body)
            );
            this.assertEquivalent(
                select("[class~=internal]"),
                select('a[class~="internal"]')
            );
            this.assertEquivalent(select("[id]"), select("*[id]"));
            this.assertEquivalent(
                select("[type=radio]"),
                getById("checked_radio", "unchecked_radio")
            );
            this.assertEquivalent(
                select("[type=checkbox]"),
                select("*[type=checkbox]")
            );
            this.assertEquivalent(
                select("[title]"),
                getById("with_title", "commaParent")
            );
            this.assertEquivalent(
                select("#troubleForm [type=radio]"),
                select("#troubleForm *[type=radio]")
            );
            this.assertEquivalent(
                select("#troubleForm [type]"),
                select("#troubleForm *[type]")
            );
        },
        "E[foo]"() {
            this.assertEquivalent(
                select("h1[class]"),
                select("#fixtures h1"),
                "h1[class]"
            );
            this.assertEquivalent(
                select("h1[CLASS]"),
                select("#fixtures h1"),
                "h1[CLASS]"
            );
            this.assertEqual(
                select("li#item_3[class]")[0],
                getById("item_3"),
                "li#item_3[class]"
            );
            this.assertEquivalent(
                select('#troubleForm2 input[name="brackets[5][]"]'),
                getById("chk_1", "chk_2")
            );
            // Brackets in attribute value
            this.assertEqual(
                select('#troubleForm2 input[name="brackets[5][]"]:checked')[0],
                getById("chk_1")
            );
            // Space in attribute value
            this.assertEqual(
                select('cite[title="hello world!"]')[0],
                getById("with_title")
            );
            // Namespaced attributes
            //  this.assertEquivalent(select('[xml:lang]'), [document.documentElement, getById("item_3")]);
            //  this.assertEquivalent(select('*[xml:lang]'), [document.documentElement, getById("item_3")]);
        },
        'E[foo="bar"]'() {
            this.assertEquivalent(
                select('a[href="#"]'),
                getById("link_1", "link_2", "link_3")
            );
            this.assertThrowsException(/Error/, () => {
                select("a[href=#]");
            });
            this.assertEqual(
                select(
                    '#troubleForm2 input[name="brackets[5][]"][value="2"]'
                )[0],
                getById("chk_2")
            );
        },
        'E[foo~="bar"]'() {
            this.assertEquivalent(
                select('a[class~="internal"]'),
                getById("link_1", "link_2"),
                'a[class~="internal"]'
            );
            this.assertEquivalent(
                select("a[class~=internal]"),
                getById("link_1", "link_2"),
                "a[class~=internal]"
            );
            this.assertEqual(
                select('a[class~=external][href="#"]')[0],
                getById("link_3"),
                'a[class~=external][href="#"]'
            );
        } /*		'E[foo|="en"]': function(){
			this.assertEqual(select('*[xml:lang|="es"]')[0], getById('item_3'));
			this.assertEqual(select('*[xml:lang|="ES"]')[0], getById('item_3'));
		},*/,
        'E[foo^="bar"]'() {
            this.assertEquivalent(
                select("div[class^=bro]"),
                getById("father", "uncle"),
                "matching beginning of string"
            );
            this.assertEquivalent(
                select('#level1 *[id^="level2_"]'),
                getById("level2_1", "level2_2", "level2_3")
            );
            this.assertEquivalent(
                select("#level1 *[id^=level2_]"),
                getById("level2_1", "level2_2", "level2_3")
            );
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *[id^=level2_]");
                    }, 1000);
                }, 500);
            }
        },
        'E[foo$="bar"]'() {
            this.assertEquivalent(
                select("div[class$=men]"),
                getById("father", "uncle"),
                "matching end of string"
            );
            this.assertEquivalent(
                select('#level1 *[id$="_1"]'),
                getById("level2_1", "level3_1")
            );
            this.assertEquivalent(
                select("#level1 *[id$=_1]"),
                getById("level2_1", "level3_1")
            );
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *[id$=_1]");
                    }, 1000);
                }, 500);
            }
        },
        'E[foo*="bar"]'() {
            this.assertEquivalent(
                select('div[class*="ers m"]'),
                getById("father", "uncle"),
                "matching substring"
            );
            this.assertEquivalent(
                select('#level1 *[id*="2"]'),
                getById("level2_1", "level3_2", "level2_2", "level2_3")
            );
            this.assertThrowsException(/Error/, () => {
                select("#level1 *[id*=2]");
            });
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *[id*=2]");
                    }, 1000);
                }, 500);
            }
        },

        // *** these should throw SYNTAX_ERR ***

        "E[id=-1]"() {
            this.assertThrowsException(/Error/, () => {
                select("#level1 *[id=-1]");
            });
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *[id=9]");
                    }, 1000);
                }, 500);
            }
        },
        "E[class=-45deg]"() {
            this.assertThrowsException(/Error/, () => {
                select("#level1 *[class=-45deg]");
            });
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *[class=-45deg]");
                    }, 1000);
                }, 500);
            }
        },
        "E[class=8mm]"() {
            this.assertThrowsException(/Error/, () => {
                select("#level1 *[class=8mm]");
            });
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *[class=8mm]");
                    }, 1000);
                }, 500);
            }
        },
    });

    runner.addGroup("Structural pseudo-classes").addTests(null, {
        "E:first-child"() {
            this.assertEqual(
                select("#level1>*:first-child")[0],
                getById("level2_1")
            );
            this.assertEquivalent(
                select("#level1 *:first-child"),
                getById("level2_1", "level3_1", "level_only_child")
            );
            this.assertEquivalent(select("#level1>div:first-child"), []);
            this.assertEquivalent(
                select("#level1 span:first-child"),
                getById("level2_1", "level3_1")
            );
            this.assertEquivalent(select("#level1:first-child"), []);
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *:first-child");
                    }, 1000);
                }, 500);
            }
        },
        "E:last-child"() {
            this.assertEqual(
                select("#level1>*:last-child")[0],
                getById("level2_3")
            );
            this.assertEquivalent(
                select("#level1 *:last-child"),
                getById("level3_2", "level_only_child", "level2_3")
            );
            this.assertEqual(
                select("#level1>div:last-child")[0],
                getById("level2_3")
            );
            this.assertEqual(
                select("#level1 div:last-child")[0],
                getById("level2_3")
            );
            this.assertEquivalent(select("#level1>span:last-child"), []);
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *:last-child");
                    }, 1000);
                }, 500);
            }
        },
        "E:nth-child(n)"() {
            this.assertEqual(select("#p *:nth-child(3)")[0], getById("link_2"));
            this.assertEqual(
                select("#p a:nth-child(3)")[0],
                getById("link_2"),
                "nth-child"
            );
            this.assertEquivalent(
                select("#list > li:nth-child(n+2)"),
                getById("item_2", "item_3")
            );
            this.assertEquivalent(
                select("#list > li:nth-child(-n+2)"),
                getById("item_1", "item_2")
            );
        },
        "E:nth-of-type(n)"() {
            this.assertEqual(
                select("#p a:nth-of-type(2)")[0],
                getById("link_2"),
                "nth-of-type"
            );
            this.assertEqual(
                select("#p a:nth-of-type(1)")[0],
                getById("link_1"),
                "nth-of-type"
            );
        },
        "E:nth-last-of-type(n)"() {
            this.assertEqual(
                select("#p a:nth-last-of-type(1)")[0],
                getById("link_2"),
                "nth-last-of-type"
            );
        },
        "E:first-of-type"() {
            this.assertEqual(
                select("#p a:first-of-type")[0],
                getById("link_1"),
                "first-of-type"
            );
        },
        "E:last-of-type"() {
            this.assertEqual(
                select("#p a:last-of-type")[0],
                getById("link_2"),
                "last-of-type"
            );
        },
        "E:only-child"() {
            this.assertEqual(
                select("#level1 *:only-child")[0],
                getById("level_only_child")
            );
            // Shouldn't return anything
            this.assertEquivalent(select("#level1>*:only-child"), []);
            this.assertEquivalent(select("#level1:only-child"), []);
            this.assertEquivalent(
                select("#level2_2 :only-child:not(:last-child)"),
                []
            );
            this.assertEquivalent(
                select("#level2_2 :only-child:not(:first-child)"),
                []
            );
            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 *:only-child");
                    }, 1000);
                }, 500);
            }
        },
        "E:empty"() {
            getById("level3_1").children = [];
            if (document.createEvent) {
                this.assertEquivalent(
                    select("#level1 *:empty"),
                    getById("level3_1", "level3_2", "level2_3"),
                    "#level1 *:empty"
                );
                this.assertEquivalent(
                    select("#level_only_child:empty"),
                    [],
                    "newlines count as content!"
                );
            } else {
                this.assertEqual(
                    select("#level3_1:empty")[0],
                    getById("level3_1"),
                    "IE forced empty content!"
                );
                // this.skip("IE forced empty content!");
            }
            // Shouldn't return anything
            this.assertEquivalent(select("span:empty > *"), []);
        },
    });

    runner.addTests(null, {
        "E:not(s)"() {
            // Negation pseudo-class
            this.assertEquivalent(select('a:not([href="#"])'), []);
            this.assertEquivalent(select("div.brothers:not(.brothers)"), []);
            this.assertEquivalent(
                select('a[class~=external]:not([href="#"])'),
                [],
                'a[class~=external][href!="#"]'
            );
            this.assertEqual(
                select("#p a:not(:first-of-type)")[0],
                getById("link_2"),
                "first-of-type"
            );
            this.assertEqual(
                select("#p a:not(:last-of-type)")[0],
                getById("link_1"),
                "last-of-type"
            );
            this.assertEqual(
                select("#p a:not(:nth-of-type(1))")[0],
                getById("link_2"),
                "nth-of-type"
            );
            this.assertEqual(
                select("#p a:not(:nth-last-of-type(1))")[0],
                getById("link_1"),
                "nth-last-of-type"
            );
            this.assertEqual(
                select("#p a:not([rel~=nofollow])")[0],
                getById("link_2"),
                "attribute 1"
            );
            this.assertEqual(
                select("#p a:not([rel^=external])")[0],
                getById("link_2"),
                "attribute 2"
            );
            this.assertEqual(
                select("#p a:not([rel$=nofollow])")[0],
                getById("link_2"),
                "attribute 3"
            );
            this.assertEqual(
                select('#p a:not([rel$="nofollow"]) > em')[0],
                getById("em"),
                "attribute 4"
            );
            this.assertEqual(
                select("#list li:not(#item_1):not(#item_3)")[0],
                getById("item_2"),
                "adjacent :not clauses"
            );
            this.assertEqual(
                select("#grandfather > div:not(#uncle) #son")[0],
                getById("son")
            );
            this.assertEqual(
                select('#p a:not([rel$="nofollow"]) em')[0],
                getById("em"),
                "attribute 4 + all descendants"
            );
            this.assertEqual(
                select('#p a:not([rel$="nofollow"])>em')[0],
                getById("em"),
                "attribute 4 (without whitespace)"
            );
        },
    });

    runner.addGroup("UI element states pseudo-classes").addTests(null, {
        "E:disabled"() {
            this.assertEqual(
                select("#troubleForm > p > *:disabled")[0],
                getById("disabled_text_field")
            );
        },
        "E:checked"() {
            this.assertEquivalent(
                select("#troubleForm *:checked"),
                getById("checked_box", "checked_radio")
            );
        },
    });

    runner.addGroup("Combinators").addTests(null, {
        "E F"() {
            // Descendant
            this.assertEquivalent(
                select("#fixtures a *"),
                getById("em2", "em", "span")
            );
            this.assertEqual(select("div#fixtures p")[0], getById("p"));
        },
        "E + F"() {
            // Adjacent sibling
            this.assertEqual(
                select("div.brothers + div.brothers")[0],
                getById("uncle")
            );
            this.assertEqual(select("div.brothers + div")[0], getById("uncle"));
            this.assertEqual(select("#level2_1+span")[0], getById("level2_2"));
            this.assertEqual(
                select("#level2_1 + span")[0],
                getById("level2_2")
            );
            this.assertEqual(select("#level2_1 + *")[0], getById("level2_2"));
            this.assertEquivalent(select("#level2_2 + span"), []);
            this.assertEqual(
                select("#level3_1 + span")[0],
                getById("level3_2")
            );
            this.assertEqual(select("#level3_1 + *")[0], getById("level3_2"));
            this.assertEquivalent(select("#level3_2 + *"), []);
            this.assertEquivalent(select("#level3_1 + em"), []);

            this.assertEqual(
                select("+ div.brothers", select("div.brothers"))[0],
                getById("uncle")
            );
            this.assertEqual(
                select("+ div", select("div.brothers"))[0],
                getById("uncle")
            );
            this.assertEqual(
                select("+span", select("#level2_1"))[0],
                getById("level2_2")
            );
            this.assertEqual(
                select("+ span", select("#level2_1"))[0],
                getById("level2_2")
            );
            this.assertEqual(
                select("+ *", select("#level2_1"))[0],
                getById("level2_2")
            );
            this.assertEquivalent(select("+ span", select("#level2_2")), []);
            this.assertEqual(
                select("+ span", select("#level3_1"))[0],
                getById("level3_2")
            );
            this.assertEqual(
                select("+ *", select("#level3_1"))[0],
                getById("level3_2")
            );
            this.assertEquivalent(select("+ *", select("#level3_2")), []);
            this.assertEquivalent(select("+ em", select("#level3_1")), []);

            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level3_1 + span");
                    }, 1000);
                }, 500);
            }
        },
        "E > F"() {
            // Child
            this.assertEquivalent(
                select("p.first > a"),
                getById("link_1", "link_2")
            );
            this.assertEquivalent(
                select("div#grandfather > div"),
                getById("father", "uncle")
            );
            this.assertEquivalent(
                select("#level1>span"),
                getById("level2_1", "level2_2")
            );
            this.assertEquivalent(
                select("#level1 > span"),
                getById("level2_1", "level2_2")
            );
            this.assertEquivalent(
                select("#level2_1 > *"),
                getById("level3_1", "level3_2")
            );
            this.assertEquivalent(select("div > #nonexistent"), []);

            this.assertEquivalent(
                select("> a", select("p.first")),
                getById("link_1", "link_2")
            );
            this.assertEquivalent(
                select("> div", select("div#grandfather")),
                getById("father", "uncle")
            );
            this.assertEquivalent(
                select(">span", select("#level1")),
                getById("level2_1", "level2_2")
            );
            this.assertEquivalent(
                select("> span", select("#level1")),
                getById("level2_1", "level2_2")
            );
            this.assertEquivalent(
                select("> *", select("#level2_1")),
                getById("level3_1", "level3_2")
            );
            this.assertEquivalent(select("> #nonexistent", select("div")), []);

            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level1 > span");
                    }, 1000);
                }, 500);
            }
        },
        "E ~ F"() {
            // General sibling
            this.assertEqual(select("h1 ~ ul")[0], getById("list"));
            this.assertEquivalent(select("#level2_2 ~ span"), []);
            this.assertEquivalent(select("#level3_2 ~ *"), []);
            this.assertEquivalent(select("#level3_1 ~ em"), []);
            this.assertEquivalent(select("div ~ #level3_2"), []);
            this.assertEquivalent(select("div ~ #level2_3"), []);
            this.assertEqual(
                select("#level2_1 ~ span")[0],
                getById("level2_2")
            );
            this.assertEquivalent(
                select("#level2_1 ~ *"),
                getById("level2_2", "level2_3")
            );
            this.assertEqual(
                select("#level3_1 ~ #level3_2")[0],
                getById("level3_2")
            );
            this.assertEqual(
                select("span ~ #level3_2")[0],
                getById("level3_2")
            );

            this.assertEqual(select("~ ul", select("h1"))[0], getById("list"));
            this.assertEquivalent(select("~ span", select("#level2_2")), []);
            this.assertEquivalent(select("~ *", select("#level3_2")), []);
            this.assertEquivalent(select("~ em", select("#level3_1")), []);
            this.assertEquivalent(select("~ #level3_2", select("div")), []);
            this.assertEquivalent(select("~ #level2_3", select("div")), []);
            this.assertEqual(
                select("~ span", select("#level2_1"))[0],
                getById("level2_2")
            );
            this.assertEquivalent(
                select("~ *", select("#level2_1")),
                getById("level2_2", "level2_3")
            );
            this.assertEqual(
                select("~ #level3_2", select("#level3_1"))[0],
                getById("level3_2")
            );
            this.assertEqual(
                select("~ #level3_2", select("span"))[0],
                getById("level3_2")
            );

            if (RUN_BENCHMARKS) {
                this.wait(function () {
                    this.benchmark(() => {
                        select("#level2_1 ~ span");
                    }, 1000);
                }, 500);
            }
        },
    });

    runner.addTests(null, {
        "NW.Dom.match"() {
            const element = getById("dupL1");
            // Assertions
            this.assert(match(element, "span"));
            this.assert(match(element, "span#dupL1"));
            this.assert(match(element, "div > span"), "child combinator");
            this.assert(
                match(element, "#dupContainer span"),
                "descendant combinator"
            );
            this.assert(match(element, "#dupL1"), "ID only");
            this.assert(match(element, "span.span_foo"), "class name 1");
            this.assert(match(element, "span.span_bar"), "class name 2");
            this.assert(
                match(element, "span:first-child"),
                "first-child pseudoclass"
            );
            // Refutations
            this.refute(match(element, "span.span_wtf"), "bogus class name");
            this.refute(match(element, "#dupL2"), "different ID");
            this.refute(match(element, "div"), "different tag name");
            this.refute(match(element, "span span"), "different ancestry");
            this.refute(match(element, "span > span"), "different parent");
            this.refute(
                match(element, "span:nth-child(5)"),
                "different pseudoclass"
            );
            // Misc.
            this.refute(match(getById("link_2"), "a[rel^=external]"));
            this.assert(match(getById("link_1"), "a[rel^=external]"));
            this.assert(match(getById("link_1"), 'a[rel^="external"]'));
            this.assert(match(getById("link_1"), "a[rel^='external']"));
        },
        "Equivalent Selectors"() {
            this.assertEquivalent(
                select("div.brothers"),
                select("div[class~=brothers]")
            );
            this.assertEquivalent(
                select("div.brothers"),
                select("div[class~=brothers].brothers")
            );
            this.assertEquivalent(
                select("div:not(.brothers)"),
                select("div:not([class~=brothers])")
            );
            this.assertEquivalent(
                select("li ~ li"),
                select("li:not(:first-child)")
            );
            this.assertEquivalent(
                select("ul > li"),
                select("ul > li:nth-child(n)")
            );
            this.assertEquivalent(
                select("ul > li:nth-child(even)"),
                select("ul > li:nth-child(2n)")
            );
            this.assertEquivalent(
                select("ul > li:nth-child(odd)"),
                select("ul > li:nth-child(2n+1)")
            );
            this.assertEquivalent(
                select("ul > li:first-child"),
                select("ul > li:nth-child(1)")
            );
            this.assertEquivalent(
                select("ul > li:last-child"),
                select("ul > li:nth-last-child(1)")
            );
            /* Opera 10 does not accept values > 128 as a parameter to :nth-child
			See <http://operawiki.info/ArtificialLimits> */
            this.assertEquivalent(
                select("ul > li:nth-child(n-128)"),
                select("ul > li")
            );
            this.assertEquivalent(select("ul>li"), select("ul > li"));
            this.assertEquivalent(
                select('#p a:not([rel$="nofollow"])>em'),
                select('#p a:not([rel$="nofollow"]) > em')
            );
        },
        "Multiple Selectors"() {
            // The next two assertions should return document-ordered lists of matching elements --Diego Perini
            //  this.assertEquivalent(select('#list, .first,*[xml:lang="es-us"] , #troubleForm'), getById('p', 'link_1', 'list', 'item_1', 'item_3', 'troubleForm'));
            //  this.assertEquivalent(select('#list, .first, *[xml:lang="es-us"], #troubleForm'), getById('p', 'link_1', 'list', 'item_1', 'item_3', 'troubleForm'));
            this.assertEquivalent(
                select(
                    'form[title*="commas,"], input[value="#commaOne,#commaTwo"]'
                ),
                getById("commaParent", "commaChild")
            );
            this.assertEquivalent(
                select(
                    'form[title*="commas,"], input[value="#commaOne,#commaTwo"]'
                ),
                getById("commaParent", "commaChild")
            );
        },
    });
})(runner);
