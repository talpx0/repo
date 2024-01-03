import  fs from 'fs/promises';
import * as path from 'path';

export async function createFolder(folderPath: string) {
    try {
       await fs.mkdir(folderPath, { recursive: true });
    } catch (error:any) {
        if (error.code !== 'EEXIST') {
            // Rethrow the error if it's not about the folder already existing
            throw error;
        }
        // If the error code is 'EEXIST', the directory already exists, so this error is ignored.
    }
}


export async function createIndexFile(basePath: string ,structure: any){
    const mdxFilePath = path.join(basePath, 'index.md');

        const mdxContent = `---
title: ${structure.title}
---
`;

    // Create the index.mdx file with initial content
    await fs.writeFile(mdxFilePath, mdxContent);
}



export async function skipWrite(filePath: string , content:string): Promise<void>  {
    try {
        await fs.access(filePath)
    }catch{
        fs.writeFile(filePath, content)
    }
}


export async function createMDFile(filePath: string, title: string): Promise<void> {
    // Format the date , e.g., 'YYYY-MM-DD'
    const formattedDate =  new Date().toISOString().split('T')[0];
    const frontMatter = `---
title: ${title}
summary: 
image: 
tags: []
---
`
    try {
        const file = filePath +'.md'
        await fs.writeFile(file, frontMatter, { flag: 'wx' });
    } catch (error:any) {
        if (error.code === 'EEXIST') {
        // Handle existing file as needed. Currently, it just logs a message.
        } else {
        throw error;
        }
    }
}

export async function writeJSONFile(filePath: string, data: object) {
    const jsonData = JSON.stringify(data, null, 2); // Beautify the JSON data
    await fs.writeFile(filePath, jsonData, 'utf8');
}