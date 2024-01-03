interface BaseTreeParams {
    title: string;
    icon: string | null;
    folderSet?: FolderSet[];
}
type FolderSet = {
    sectionHeader?: string;
    folders: FolderTree[] | BaseTree[];
};
type FileMeta = {
    title: string;
    shortcut?: string;
    feature?: string[];
};
declare class BaseTree {
    title: string;
    icon: string | null;
    folderSet?: FolderSet[];
    constructor(params: BaseTreeParams);
}
interface FolderTreeParams extends BaseTreeParams {
    isRoute: boolean;
    tag?: string[];
    feature?: string[];
    files?: FileMeta[];
}
declare class FolderTree extends BaseTree {
    isRoute: boolean;
    tag?: string[];
    feature?: string[];
    files?: FileMeta[];
    constructor(params: FolderTreeParams);
}
