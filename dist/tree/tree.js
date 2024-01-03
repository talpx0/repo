"use strict";
class BaseTree {
    constructor(params) {
        this.title = params.title;
        this.icon = params.icon;
        this.folderSet = params.folderSet;
    }
}
class FolderTree extends BaseTree {
    constructor(params) {
        super(params);
        this.isRoute = params.isRoute;
        this.tag = params.tag;
        this.feature = params.feature;
        this.files = params.files;
    }
}
