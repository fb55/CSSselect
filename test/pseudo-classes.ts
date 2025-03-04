import * as CSSselect from "../src";
import { DomUtils, parseDocument, parseDOM } from "htmlparser2";
import type { AnyNode, Element } from "domhandler";
import type { Adapter } from "../src/types.js";

const dom = parseDOM(
    "<div><p>In the end, it doesn't really Matter.</p><div>Indeed-that's a delicate matter.</div>",
) as Element[];

describe(":icontains", () => {
    describe("ignore case", () => {
        it("should match full string", () => {
            let matches = CSSselect.selectAll(
                ":icontains(indeed-that's a delicate matter.)",
                dom,
            );
            expect(matches).toHaveLength(2);
            expect(matches).toStrictEqual([dom[0], dom[0].children[1]]);
            matches = CSSselect.selectAll(
                ":icontains(inDeeD-THAT's a DELICATE matteR.)",
                dom,
            );
            expect(matches).toHaveLength(2);
            expect(matches).toStrictEqual([dom[0], dom[0].children[1]]);
        });

        it("should match substring", () => {
            let matches = CSSselect.selectAll(":icontains(indeed)", dom);
            expect(matches).toHaveLength(2);
            expect(matches).toStrictEqual([dom[0], dom[0].children[1]]);
            matches = CSSselect.selectAll(":icontains(inDeeD)", dom);
            expect(matches).toHaveLength(2);
            expect(matches).toStrictEqual([dom[0], dom[0].children[1]]);
        });

        it("should match specific element", () => {
            let matches = CSSselect.selectAll("p:icontains(matter)", dom);
            expect(matches).toHaveLength(1);
            expect(matches).toStrictEqual([dom[0].children[0]]);
            matches = CSSselect.selectAll("p:icontains(mATter)", dom);
            expect(matches).toHaveLength(1);
            expect(matches).toStrictEqual([dom[0].children[0]]);
        });

        it("should match multiple elements", () => {
            let matches = CSSselect.selectAll(":icontains(matter)", dom);
            expect(matches).toHaveLength(3);
            expect(matches).toStrictEqual([
                dom[0],
                dom[0].children[0],
                dom[0].children[1],
            ]);
            matches = CSSselect.selectAll(":icontains(mATter)", dom);
            expect(matches).toHaveLength(3);
            expect(matches).toStrictEqual([
                dom[0],
                dom[0].children[0],
                dom[0].children[1],
            ]);
        });

        it("should match empty string", () => {
            const matches = CSSselect.selectAll(":icontains()", dom);
            expect(matches).toHaveLength(3);
            expect(matches).toStrictEqual([
                dom[0],
                dom[0].children[0],
                dom[0].children[1],
            ]);
        });

        it("should match quoted string", () => {
            let matches = CSSselect.selectAll(":icontains('')", dom);
            expect(matches).toHaveLength(3);
            expect(matches).toStrictEqual([
                dom[0],
                dom[0].children[0],
                dom[0].children[1],
            ]);
            matches = CSSselect.selectAll("p:icontains('matter')", dom);
            expect(matches).toHaveLength(1);
            expect(matches).toStrictEqual([dom[0].children[0]]);
            matches = CSSselect.selectAll('p:icontains("matter")', dom);
            expect(matches).toHaveLength(1);
            expect(matches).toStrictEqual([dom[0].children[0]]);
        });

        it("should match whitespace", () => {
            let matches = CSSselect.selectAll(":icontains( matter)", dom);
            expect(matches).toHaveLength(3);
            expect(matches).toStrictEqual([
                dom[0],
                dom[0].children[0],
                dom[0].children[1],
            ]);
            matches = CSSselect.selectAll(":icontains( mATter)", dom);
            expect(matches).toHaveLength(3);
            expect(matches).toStrictEqual([
                dom[0],
                dom[0].children[0],
                dom[0].children[1],
            ]);
        });
    });

    describe("no matches", () => {
        it("should not match", () => {
            const matches = CSSselect.selectAll("p:icontains(indeed)", dom);
            expect(matches).toHaveLength(0);
        });
    });
});

describe("unmatched", () => {
    it("should throw on unknown pseudo-class (#741)", () => {
        expect(() => CSSselect.selectAll(":unmatched(foo)", dom)).toThrow(
            "Unknown pseudo-class :unmatched",
        );

        expect(() => CSSselect.selectAll(":unmatched(foo)", dom)).toThrow(
            "Unknown pseudo-class :unmatched",
        );

        expect(() => CSSselect.selectAll(":host-context(foo)", dom)).toThrow(
            "Unknown pseudo-class :host-context",
        );
    });
});

describe(":first-child", () => {
    it("should match", () => {
        const matches = CSSselect.selectAll(":first-child", dom);
        expect(matches).toHaveLength(2);
        expect(matches).toStrictEqual([dom[0], dom[0].children[0]]);
    });

    it("should work without `prevElementSibling`", () => {
        const adapter: Adapter<AnyNode, Element> = { ...DomUtils };
        delete adapter.prevElementSibling;

        const matches = CSSselect.selectAll(":first-child", dom, { adapter });
        expect(matches).toHaveLength(2);
        expect(matches).toStrictEqual([dom[0], dom[0].children[0]]);
    });
});

describe(":empty", () => {
    // Adopted from the example in https://www.w3.org/TR/selectors-4/#the-empty-pseudo

    it("should match", () => {
        const dom = parseDocument(`
            <p></p>
            <p>
            <p> </p>
            <p></p>
        `);
        const matches = CSSselect.selectAll("p:empty", dom);
        expect(matches).toHaveLength(4);
    });

    it("should not match", () => {
        const dom = parseDocument(`
            <div>text</div>
            <div><p></p></div>
            <div>&nbsp;</div>
            <div><p>bla</p></div>
            <div>this is not <p>:empty</p></div>
        `);
        const matches = CSSselect.selectAll("div:empty", dom);
        expect(matches).toHaveLength(0);
    });
});

describe(":has", () => {
    it("should cache :has if applicable", () => {
        const dom = parseDocument(`
            <div>
                <div class="a">
                    <div class="b"></div>
                    <div class="c"></div>
                </div>
                <div class="d"></div>
            </div>
        `);
        const compiled = CSSselect.compile(":has(.a .b ~ .c)");

        expect(
            CSSselect.selectAll<AnyNode, Element>(compiled, dom),
        ).toHaveLength(2);

        (dom.childNodes[1] as any).childNodes[1].attribs.class = "";

        // Should not find the element anymore
        expect(CSSselect.selectAll<AnyNode, Element>(".a", dom)).toHaveLength(
            0,
        );
        // But as we have cached the results in `compiled`, we should succeed here.
        expect(
            CSSselect.selectAll<AnyNode, Element>(compiled, dom),
        ).toHaveLength(2);
    });
});

describe(":read-only and :read-write", () => {
    it("should match", () => {
        const dom = parseDocument(`
            <div>
                <input type="text" readonly>
                <input type="text">
                <input type="color" readonly>
                <input type="color">
                <textarea readonly></textarea>
                <textarea></textarea>
            </div>
        `);
        const readonly = CSSselect.compile(":read-only");
        const readwrite = CSSselect.compile(":read-write");

        expect(
            CSSselect.selectAll<AnyNode, Element>(readonly, dom),
        ).toHaveLength(2);

        expect(
            CSSselect.selectAll<AnyNode, Element>(readwrite, dom),
        ).toHaveLength(2);
    });
});
