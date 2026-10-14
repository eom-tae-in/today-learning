import assert from "node:assert/strict";
import test from "node:test";
import { findCodeBreakPoints } from "../src/lib/code-wrap.mjs";

const split = text => { const points = findCodeBreakPoints(text); return [0, ...points].map((start, index) => text.slice(start, points[index] ?? text.length)); };

test("breaks after dots, opening parentheses and commas inside long tokens", () => {
    assert.deepEqual(split("<groupId>org.springframework.cloud</groupId>"), ["<groupId>org.", "springframework.", "cloud</groupId>"]);
    assert.deepEqual(split("ResponseEntity.status(HttpStatus.CREATED)"), ["ResponseEntity.", "status(", "HttpStatus.", "CREATED)"]);
    assert.deepEqual(split("Map.of(a,b)"), ["Map.", "of(", "a,", "b)"]);
});

test("leaves spaces, empty calls, number dots and repeated marks alone", () => {
    assert.deepEqual(findCodeBreakPoints("call(a, b)"), [5]);
    assert.deepEqual(findCodeBreakPoints("builder.build()"), [8]);
    assert.deepEqual(findCodeBreakPoints("<version>3.2.1</version>"), []);
    assert.deepEqual(split("method(...args)"), ["method(", "...args)"]);
    assert.deepEqual(findCodeBreakPoints("        .body(response)"), [14]);
    assert.deepEqual(findCodeBreakPoints("끝났다."), []);
    assert.deepEqual(findCodeBreakPoints(""), []);
});

test("the points never change the text itself", () => {
    const text = "http.authorizeHttpRequests(auth -> auth.requestMatchers(\"/api/**\").permitAll())";
    assert.equal(split(text).join(""), text);
});
