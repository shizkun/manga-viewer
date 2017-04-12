import ko from "knockout";
import _ from "lodash";

import api from "js/common/api";
import Folder from "js/models/folder.viewmodel";
import template from "./sidebar.template.html";
import path from "path";

export class SidebarViewmodel {

    constructor(params) {
        console.log("SidebarViewmodel::constructor");
        var self = this;
        this.bookmarks = params.bookmarks;
        this.currentPage = params.currentPage;
        this.folders = ko.observableArray();

        this.directories = ko.computed(this.getFolderTree, this).extend({
            rateLimit: 50
        });
        this.map = {};

        this.selectedDirectory = params.selectedDirectory;
        this.selectDirectory = this.selectDirectory.bind(this);
        this.currentFolder = params.currentFolder;
        this.isFavoritesActive = ko.computed(this.isFavoritesActive, this);
        this.subs = [];

        this.initialize();
    }

    initialize() {
        let self = this;
        let last = this.currentFolder();
        let isBookmarked = _(this.bookmarks()).map('folderPath').includes(this.currentFolder());
        console.log("SidebarViewmodel::initialize- currentFolder:", last);
        if (last) {
            let baseName = path.basename(last);
            var root = new Folder({
                folderName: baseName,
                folderPath: last,
                isBookmarked: isBookmarked
            });
            self.folders([root]);
            root.isOpen(true); //initialize to call API.
            self.selectedDirectory(root);
        }
    };
    recursive(folder, array) {
        array.push(folder);
        if (folder.isOpen()) {
            folder.children().forEach((child) => this.recursive(child, array));
        }
        return array;
    }
    getFolderTree() {
        console.log("SidebarViewmodel::getFolderTree");
        let array = [];
        this.folders().forEach((child) => this.recursive(child, array));
        return array;
    }

    selectDirectory(folder) {
        this.selectedDirectory(folder);
        this.currentPage("manga-list");
    }

    openDirectory() {
        var self = this;
        api.selectDirectory().then(function(folder) {
            console.log(`You selected ${folder}`);
            self.currentFolder(folder);
            self.initialize();
        });
    }
    showFavorites() {
        this.currentPage("favorites-list");
    }
    isFavoritesActive() {
        return this.currentPage() == "favorites-list";
    }
    dispose() {
        console.log("SidebarViewmodel:executing dispose");
    };

    static registerComponent() {
        ko.components.register("sidebar", {
            viewModel: SidebarViewmodel,
            template: template
        });
    };
}
