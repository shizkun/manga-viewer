import ko from "knockout";
import _ from "lodash";
import $ from "jquery";

import api from "renderer-process/common/api.js";
import Command from "renderer-process/models/command.viewmodel";
import template from "./topbar.template.html";
import { ViewMangaCommand } from "renderer-process/components";
const ipc = window.require('electron').ipcRenderer;

export class TopBarViewmodel {
    constructor(params) {
        console.log("TopBarViewmodel::constructor - end");
        let self = this;
        this.subscriptions = [];
        this.selectedManga = params.selectedManga;
        this.favorites = params.favorites;
        this.currentPage = params.currentPage;
        this.appTitle = params.appTitle;
        this.appCommands = params.appCommands;

        this.currentViewMangaPage = params.currentViewMangaPage;
        this.viewMangaCommand = params.viewMangaCommand;
        this.searching = params.searching;
        this.mangaTitle = ko.pureComputed(this.mangaTitle, this);
        this.isFavorite = ko.pureComputed(this.isFavorite, this);
        this.topBarText = ko.pureComputed(this.topBarText, this);
        this.showSidebar = ko.observable();

        this.goNextPage = this.goNextPage.bind(this);
        this.goPrevPage = this.goPrevPage.bind(this);
        this.toggleFavorite = this.toggleFavorite.bind(this);

        this.commands = [
            new Command(this.appCommands().BOOKMARK_MANGA, this.toggleFavorite),
        ];

        console.log("TopBarViewmodel::constructor - end", this.currentPage());
    }

    // methods
    initialize() {

    }

    dispose() {
        console.log("TopBarViewmodel::dispose")
        this.subscriptions.forEach(sub => sub.dispose());
    }

    mangaTitle() {
        let manga = this.selectedManga();
        if (manga) {
            return manga.mangaTitle;
        } else {
            return "";
        }
    }

    toggleFavorite() {
        console.log("toggleFavorite");
        let manga = this.selectedManga();
        manga.isFavorite(!manga.isFavorite());
        if (manga.isFavorite()) {
            this.favorites.push(manga.folderPath);
        } else {
            this.favorites.remove(manga.folderPath);
        }
    }

    isFavorite() {
        let manga = this.selectedManga();
        if (manga) {
            return manga.isFavorite();
        } else {
            return false;
        }
    }

    goNextPage() {
        this.viewMangaCommand(ViewMangaCommand.NextPage);
    }

    goPrevPage() {
        this.viewMangaCommand(ViewMangaCommand.PrevPage);
    }
    topBarText() {
        if (this.selectedManga()) {
            return this.selectedManga().mangaTitle;
        } else {
            return this.appTitle();
        }
    }
    static registerComponent() {
        ko.components.register("topbar", {
            viewModel: TopBarViewmodel,
            template: template,
            synchronous: true
        });
    }
}

TopBarViewmodel.registerComponent();