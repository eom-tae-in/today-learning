import assert from "node:assert/strict";
import test from "node:test";
import { countReadableCharacters, getReadingMinutes } from "../src/lib/reading-time.mjs";

test("reading characters exclude whitespace and fenced code blocks", () => {
    assert.equal(countReadableCharacters("가 나\n다\t라"), 4);
    assert.equal(countReadableCharacters("앞\n```java\nclass Example {}\n```\n뒤"), 2);
    assert.equal(countReadableCharacters("앞\n~~~\n코드\n~~~\n뒤"), 2);
    assert.equal(countReadableCharacters("앞\n````md\n```\n안쪽\n```\n````\n뒤"), 2);
    assert.equal(countReadableCharacters("앞\n```\n닫히지 않은 코드"), 1);
});

test("inline code and indented fences that are not code blocks are counted", () => {
    assert.equal(countReadableCharacters("`code` 값"), 7);
    assert.equal(countReadableCharacters("    ```\n본문"), 5);
});

test("reading minutes round up at 500 characters per minute with a minimum of one", () => {
    assert.equal(getReadingMinutes(""), 1);
    assert.equal(getReadingMinutes("가".repeat(500)), 1);
    assert.equal(getReadingMinutes("가".repeat(501)), 2);
    assert.equal(getReadingMinutes("가".repeat(1000) + "\n```\n" + "코".repeat(5000) + "\n```"), 2);
});
