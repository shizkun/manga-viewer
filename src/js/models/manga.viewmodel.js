import ko from "knockout";
import _ from "lodash";
import api from "js/common/api";
import "js/common/ko.custom-functions";
export default class Manga {
    constructor({
        mangaTitle,
        folderPath,
        isFavorite,
        thumbnail
    }) {
        console.log("Manga::constructor")
        this.mangaTitle = mangaTitle || "";
        this.folderPath = folderPath;
        this.isFavorite = ko.observable(isFavorite).toggleable();
        this.thumbnail = thumbnail;
    }

    toggleFolderOpen() {
        this.isOpen(!this.isOpen());
    }

    paddingLeft() {
        return `${5 + 20 * this.level}px`;
    }
}
