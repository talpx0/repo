"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routify = exports.getUniquePath = exports.slugify = void 0;
const slugify = (str) => {
    return str
        .toString()
        .toLowerCase()
        .trim() // Remove whitespace from both ends of a string
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters except for -
        .replace(/\-\-+/g, '-'); // Replace multiple - with single -
};
exports.slugify = slugify;
function getUniquePath(originalPath, existingPaths) {
    let uniquePath = originalPath;
    let counter = 1;
    while (existingPaths.has(uniquePath)) {
        uniquePath = `${originalPath}-${counter}`;
        counter++;
    }
    existingPaths.add(uniquePath);
    return uniquePath;
}
exports.getUniquePath = getUniquePath;
const routify = (str) => {
    return str
        .toString()
        .toLowerCase()
        .trim() // Remove whitespace from both ends of a string
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/\\/g, '/') // Convert all backslashes to forward slashes
        .replace(/[^\w\-\/]+/g, '') // Remove all non-word characters except for - and /
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/\/{2,}/g, '/'); // Replace multiple / with single /
};
exports.routify = routify;
