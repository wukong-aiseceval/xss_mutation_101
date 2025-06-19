"use strict";

const becca = require('./becca.js');
const cls = require('../services/cls');
const protectedSessionService = require('../services/protected_session');
const log = require('../services/log');

function isNotePathArchived(notePath) {
    const noteId = notePath[notePath.length - 1];
    const note = becca.notes[noteId];

    if (note.isArchived) {
        return true;
    }

    for (let i = 0; i < notePath.length - 1; i++) {
        const note = becca.notes[notePath[i]];

        // this is going through parents so archived must be inheritable
        if (note.hasInheritableOwnedArchivedLabel()) {
            return true;
        }
    }

    return false;
}

/**
 * This assumes that note is available. "archived" note means that there isn't a single non-archived note-path
 * leading to this note.
 *
 * @param noteId
 */
function isArchived(noteId) {
    const notePath = getSomePath(noteId);

    return isNotePathArchived(notePath);
}

/**
 * @param {string} noteId
 * @param {string} ancestorNoteId
 * @return {boolean} - true if given noteId has ancestorNoteId in any of its paths (even archived)
 */
function isInAncestor(noteId, ancestorNoteId) {
    if (ancestorNoteId === 'root' || ancestorNoteId === noteId) {
        return true;
    }

    const note = becca.notes[noteId];

    if (!note) {
        return false;
    }

    for (const parentNote of note.parents) {
        if (isInAncestor(parentNote.noteId, ancestorNoteId)) {
            return true;
        }
    }

    return false;
}

function getNoteTitle(childNoteId, parentNoteId) {
    const childNote = becca.notes[childNoteId];
    const parentNote = becca.notes[parentNoteId];

    if (!childNote) {
        log.info(`Cannot find note in cache for noteId '${childNoteId}'`);
        return "[error fetching title]";
    }

    const title = childNote.getTitleOrProtected();

    const branch = parentNote ? becca.getBranchFromChildAndParent(childNote.noteId, parentNote.noteId) : null;

    return ((branch && branch.prefix) ? `${branch.prefix} - ` : '') + title;
}

function getNoteTitleArrayForPath(notePathArray) {
    if (!notePathArray || !Array.isArray(notePathArray)) {
        throw new Error(`${notePathArray} is not an array.`);
    }

    if (notePathArray.length === 1 && notePathArray[0] === cls.getHoistedNoteId()) {
        return [getNoteTitle(cls.getHoistedNoteId())];
    }

    const titles = [];

    let parentNoteId = 'root';
    let hoistedNotePassed = false;

    for (const noteId of notePathArray) {
        // start collecting path segment titles only after hoisted note
        if (hoistedNotePassed) {
            const title = getNoteTitle(noteId, parentNoteId);

            titles.push(title);
        }

        if (noteId === cls.getHoistedNoteId()) {
            hoistedNotePassed = true;
        }

        parentNoteId = noteId;
    }

    return titles;
}

function getNoteTitleForPath(notePathArray) {
    const titles = getNoteTitleArrayForPath(notePathArray);

    return titles.join(' / ');
}

/**
 * Returns notePath for noteId from cache. Note hoisting is respected.
 * Archived (and hidden) notes are also returned, but non-archived paths are preferred if available
 * - this means that archived paths is returned only if there's no non-archived path
 * - you can check whether returned path is archived using isArchived
 */
function getSomePath(note, path = []) {
    // first try to find note within hoisted note, otherwise take any existing note path
    return getSomePathInner(note, path, true)
        || getSomePathInner(note, path, false);
}

function getSomePathInner(note, path, respectHoisting) {
    if (note.isRoot()) {
        path.push(note.noteId);
        path.reverse();

        if (respectHoisting && !path.includes(cls.getHoistedNoteId())) {
            return false;
        }

        return path;
    }

    const parents = note.parents;
    if (parents.length === 0) {
        console.log(`Note ${note.noteId} - "${note.title}" has no parents.`);

        return false;
    }

    for (const parentNote of parents) {
        const retPath = getSomePathInner(parentNote, path.concat([note.noteId]), respectHoisting);

        if (retPath) {
            return retPath;
        }
    }

    return false;
}

function getNotePath(noteId) {
    const note = becca.notes[noteId];

    if (!note) {
        console.trace(`Cannot find note '${noteId}' in cache.`);
        return;
    }

    const retPath = getSomePath(note);

    if (retPath) {
        const noteTitle = getNoteTitleForPath(retPath);

        let branchId;

        if (note.isRoot()) {
            branchId = 'root';
        }
        else {
            const parentNote = note.parents[0];
            branchId = becca.getBranchFromChildAndParent(noteId, parentNote.noteId).branchId;
        }

        return {
            noteId: noteId,
            branchId: branchId,
            title: noteTitle,
            notePath: retPath,
            path: retPath.join('/')
        };
    }
}

/**
 * @param noteId
 * @returns {boolean} - true if note exists (is not deleted) and is available in current note hoisting
 */
function isAvailable(noteId) {
    const notePath = getNotePath(noteId);

    return !!notePath;
}

module.exports = {
    getSomePath,
    getNotePath,
    getNoteTitle,
    getNoteTitleForPath,
    isAvailable,
    isArchived,
    isInAncestor,
    isNotePathArchived
};
