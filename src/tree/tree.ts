import { createFolder, createIndexFile, createMDFile, writeJSONFile } from "../util/fs";
import { getUniquePath, routify, slugify } from "../util/slug";
import path from 'path';
import * as fs from 'fs/promises';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { ArticleWithTags, getArticlesByRoutePath, insertMultipleRoutes } from "../db/db";

interface BaseTreeParams {
    title: string;
    icon?: string;
    folderSet?: FolderSet[];
}

type FolderSet = {
    sectionHeader?: string
    folders: FolderTree[]|BaseTree[]
}

type NavigationSet = {
    sectionHeader?:string
    navigation: NavigationParams[]
}

type FileSet = {
    title: string;
    shortcut?: string;
    feature: string[];
}

type NavigationParams = {
    icon?:string 
    description?:string
    title:string
    href:string 
    menu: NavigationSet[]
} 

export type RoutesMeta = {
    title: string;
    icon?: string;
    id: string;
    route: string;
    feature?: string[];
    folderSet?: SubRoutesMeta[]; // Recursive reference for nested folders
    files: FileMeta[]; // Reference to the FileMeta type
  };
  
  type FileMeta = {
    id: string;
    title: string;
    icon?:string;
    shortcut?: string;
    route: string;
    date: Date; 
    publisher_id?: string| null;
    tag?: string[];
    feature?: string[];
  };
  
  type SubRoutesMeta = {
    sectionHeader?: string;
    folders: RoutesMeta[];
  }

  type TravelParams = {
    routesMeta: Partial<RoutesMeta>;
    basePath: string;
    structure: FolderTree;
    relatPath: string;
    depth?: number;
    parentId?: string;
};


export class BaseTree {
    title: string;
    icon?: string;
    isRoute: boolean;
    folderSet?: FolderSet[];

    constructor(params: BaseTreeParams) {
        this.title = params.title;
        this.icon = params.icon;
        this.isRoute = true
        this.folderSet = params.folderSet;
     }

    getLeaf(): BaseTree[] {
        let leaves: BaseTree[] = [];
        const traverse = (node: BaseTree) => {
            if (!node.folderSet || node.folderSet.length === 0) {
                leaves.push(node);
            } else {
                node.folderSet.forEach(subTree => {
                    subTree.folders?.forEach(folder => traverse(folder as BaseTree) );
                });
            }
        };
        traverse(this);
        return leaves;
    }

    static async initializeFromYAML(filePath: string):Promise<BaseTree|null> {
        try {
            const fileContents = await fs.readFile(filePath, 'utf8');
            const params: BaseTreeParams = yaml.load(fileContents) as BaseTreeParams;
            return new BaseTree(params);
        } catch (e) {
            console.error(e);
            return null;
        }
    }
      
    async createStructure(basePath:string="", relatPath:string="content", depth:number = 0){
        if (depth === 0) basePath = path.join(basePath, relatPath).replace(/\\/g, '/')
        if (this.folderSet && this.folderSet.length != 0) {
            for (const folderSet of this.folderSet) {
                for (const folder of folderSet.folders) {
                    const route = slugify(folder.title);
                    const newBasePath = path.join(basePath, route).replace(/\\/g, '/');
                    await createFolder(newBasePath);
                    await this.createStructure(newBasePath, relatPath, depth + 1);
                }
            } 
        }
    }

    createNavigation(end: number = 0) {
        const nav: Partial<NavigationParams> = {};
        this.dfs(nav, this, 0, end);
    }

    flatRoute(basePath = ""):string[]{
        const newPath = path.join(basePath, slugify(this.title));
        const result = [newPath];
        if (this.folderSet) {
            for (const folderSet of this.folderSet) {
                for (const folder of folderSet.folders){
                    const folderResult = (folder as FolderTree).flatRoute(newPath);
                     result.push(...folderResult);
                }
            }    
        }
        return result;
    }

    createRoutes(){
        insertMultipleRoutes(this.flatRoute())
    }

   
    private async getRoutesMeta(basePath = "", structure: RoutesMeta, id = "x"): Promise<void> {
        const newPath = path.join(basePath, slugify(this.title));
    
        // Setting basic properties of the structure
        structure.title = this.title;
        structure.route = newPath;
        structure.id = id;
        structure.icon = this.icon;
    
        // Fetching articles and creating file metadata
        const articles = await getArticlesByRoutePath(newPath);
        structure.files = articles.map(article => this.createFileMetaFromArticle(article, newPath));
    
        // Processing each folder in the folder set
        if (this.folderSet && this.folderSet.length > 0) {
            const folderSetPromises = this.folderSet.map((folderSet, i) => 
                this.processFolder(folderSet, newPath, `${id}-${i}`)
            );
            structure.folderSet = await Promise.all(folderSetPromises);
        }
    }
    
    private createFileMetaFromArticle(article: ArticleWithTags , basePath: string): FileMeta {
        const meta = article.meta as { icon?: string, shortcut?: string, features?: string[] };
        return {
            id: article.id,
            title: article.title,
            icon: meta.icon,
            shortcut: meta.shortcut,
            route: basePath + article.segment,
            date: article.date,
            publisher_id: article.publisherId,
            tag: article.tags,
            feature: meta.features,
        };
    }
    private async processFolder(folderSet: FolderSet, basePath: string, parentId: string): Promise<SubRoutesMeta> {
        const foldersPromises = folderSet.folders.map(async (folder, j) => {
            const folderMeta: Partial<RoutesMeta> = {};
            await this.getRoutesMeta(basePath, folderMeta as RoutesMeta, `${parentId}-${j}`);
            return folderMeta as RoutesMeta;
        });
    
        const folders = await Promise.all(foldersPromises);
    
        const subGroupMeta: SubRoutesMeta = {
            sectionHeader: folderSet.sectionHeader,
            folders: folders
        };
    
        return subGroupMeta;
    }

    private dfs(
        nav: Partial<NavigationParams>, 
        structure: BaseTree, 
        start: number, 
        end: number):Partial<NavigationParams>|void{
        if (start >= end) {
            return ;
        }
        nav.description = "";
        nav.title = structure.title;
        nav.href = slugify(structure.title);
        nav.icon = structure.icon;
        if (structure.folderSet) {
            nav.menu = structure.folderSet.map(subTree => {
                const navigationSet: Partial<NavigationSet> = {
                    sectionHeader: subTree.sectionHeader,
                    navigation: []
                };

                subTree.folders?.forEach(folder => {
                    const folderNav: Partial<NavigationParams> = {};
                    this.dfs(folderNav, folder as BaseTree, start + 1, end);
                    navigationSet.navigation?.push(folderNav as NavigationParams);
                });

                return navigationSet as NavigationSet;
            });
        }
        if (start === 0){
            return nav
        }
    }
}

interface FolderTreeParams extends BaseTreeParams {
    tag?: string[];
    feature?: string[];
    files?: FileSet[];
}

class FolderTree extends BaseTree {
    tag?: string[];
    feature?: string[];
    files?: FileSet[];

    constructor(params: FolderTreeParams) {
        super(params);
        this.tag = params.tag;
        this.feature = params.feature;
        this.files = params.files;
    }
    connectTree(baseTree: BaseTree){
       const parentLeaf = baseTree.getLeaf()
       const matchTree = parentLeaf.find(item => item.title === this.title)
       if (matchTree) {
        matchTree.folderSet = this.folderSet
       }
       return matchTree
    } 

    async createFolderStructure(basePath: string, relatPath: string, depth: number): Promise<void> {
        const routesMeta: Partial<RoutesMeta> = {};
        await this.travel(routesMeta, basePath, this, relatPath, depth)
    }

    private async travel(
        routesMeta: Partial<RoutesMeta>,
        basePath: string='content',
        structure: FolderTree,
        relatPath: string,
        depth: number = 0,
        parentId: string = 'x',
    ): Promise<void> {
        const id = `${parentId}`;
        routesMeta.id = id;

        if (depth === 0 ){
            basePath = path.join(basePath, relatPath).replace(/\\/g, '/');
            routesMeta.title = structure.title;
            routesMeta.route = basePath.slice("content".length);
        }else{
            const newRoute = slugify(structure.title);
            // recursion , it will become /content/a join b 
            basePath = path.join(basePath,newRoute).replace(/\\/g, '/');
            routesMeta.title = structure.title;
            await createFolder(basePath);
            routesMeta.route = basePath.slice("content".length);
            if (structure.isRoute) {
                // create an index file
                createIndexFile(basePath, structure)
            }
        }
        if (structure.folderSet) {
            await this.processFolderSet(structure, routesMeta, basePath, relatPath, depth, id);
        }

        if (structure.files) {
            await this.processFiles(structure, routesMeta, basePath);
        }

        if (depth === 0) {
            const jsonFilePath = path.join(basePath, 'routesMeta.json');
            await writeJSONFile(jsonFilePath, routesMeta);
        }
    }

    private async processFolderSet(
        structure: FolderTree, 
        routesMeta: Partial<RoutesMeta>, 
        basePath: string, 
        relatPath: string, 
        depth: number, 
        parentId: string ): Promise<void> {
        if (!structure.folderSet || structure.folderSet.length === 0) {
            return; // Exit the function if folderSet is undefined or empty
        }
    
        routesMeta.folderSet = [];
        for (let i = 0; i < structure.folderSet.length; i++) {
            const subGroup = structure.folderSet[i];
            const subGroupMeta: SubRoutesMeta = {
                sectionHeader: subGroup.sectionHeader!,
                folders: []
            };
            if (subGroup.folders && subGroup.folders.length > 0) {
                for (let j = 0; j < subGroup.folders.length; j++) {
                    const folder = subGroup.folders[j];
                    const folderMeta: Partial<RoutesMeta> = {};
                    await this.travel(
                        folderMeta, 
                        basePath, 
                        folder as FolderTree, 
                        relatPath, 
                        depth + 1, 
                        `${parentId}-${i}-${j}`);
                    subGroupMeta.folders.push(folderMeta as RoutesMeta);
                }
            }
            routesMeta.folderSet.push(subGroupMeta);
        }
    }
    
    private async processFiles(
        structure: FolderTree, 
        routesMeta: Partial<RoutesMeta>, 
        basePath: string,
        ): Promise<void> {
        if (!structure.files || structure.files.length === 0) {
            return; // Exit the function if files is undefined or empty
        }
    
        routesMeta.files = [];
        const fileSet = new Set<string>();
    
        for (let i = 0; i < structure.files.length; i++) {
            const file = structure.files[i];
            const fileRoute = slugify(file.shortcut || file.title);
            const filePath = path.join(basePath, fileRoute).replace(/\\/g, '/');
            const uniquePath = getUniquePath(filePath, fileSet);
            await createMDFile(uniquePath, file.title);
            routesMeta.files.push({
                id: uuidv4(),
                title: file.title,
                route: uniquePath.slice('content'.length),
                shortcut: file.shortcut,
                icon: structure.icon,
                feature: file.feature,
                date: new Date(Date.now()),
            });
        }
    }

    private async ProcessFileFromDB(structure: FolderTree, routesMeta:Partial<RoutesMeta>,basePath: string){

    }
    
}


async function processYamlFiles(directoryPath: string, depth:number = 0) {
    try {
        const items = await fs.readdir(directoryPath, { withFileTypes: true });
        for (const item of items) {
            const itemPath = path.join(directoryPath, item.name);
            if (item.isDirectory()) {
                await processYamlFiles(itemPath, depth+1); // Recursive call for directories
            } else if (item.isFile() && (item.name.endsWith('.yml') || item.name.endsWith('.yaml'))) {
                if (depth === 0 ){
                    return 
                }
                const fileContents = await fs.readFile(itemPath, 'utf8');
                const structure = new FolderTree(yaml.load(fileContents) as FolderTreeParams)
                let rmExtension = itemPath
                    .replace(/\\/g, '/') 
                    .slice("routes/".length)
                for (let i = rmExtension.length-1 ; i >=0; i--){
                    if (rmExtension[i] === '.') {
                        rmExtension = rmExtension.slice(0 , i)
                    }
                }
                const folderPath = routify(rmExtension)                
                await structure.createStructure('content', folderPath)
            }
        }
    } catch (e) {
        console.error(e);
    }
}

interface NArrayTree<T> {
    [key: string]: T | NArrayTree<T>[];
}

function isNArrayTree<T>(node: any): node is NArrayTree<T> {
    if (typeof node !== 'object' || node === null) {
        return false;
    }

    const keys = Object.keys(node);

    // Check for a children array. If a children key exists, verify each child.
    return keys.some(key => {
        const potentialChildren = node[key];
        if (Array.isArray(potentialChildren)) {
            // If children array is found, recursively check each child node
            return potentialChildren.every(child => isNArrayTree(child));
        } else {
            // If there's no children array, it's still a valid node (likely a leaf)
            return true;
        }
    });
}
