class TreeNode {
    value: number;
    children: TreeNode[];

    constructor(value: number) {
        this.value = value;
        this.children = [];
    }

    // Method to add a variable number of children
    addChildren(...children: TreeNode[]) {
        this.children.push(...children);
    }
}

// Function to return nodes within a specified depth range
function getNodesInDepthRange(root: TreeNode, minDepth: number, maxDepth: number): TreeNode[] {
    let result: TreeNode[] = [];

    function dfs(node: TreeNode, depth: number) {
        if (depth === minDepth) {
            result.push(node);
        }
        if (depth < maxDepth) {
            node.children.forEach(child => dfs(child, depth + 1));
        }
    }

    dfs(root, 0);
    return result;
}

// Example: Creating a tree
const root = new TreeNode(1);
const child1 = new TreeNode(2);
child1.addChildren(new TreeNode(5), new TreeNode(6));
const child2 = new TreeNode(3);
child2.addChildren(new TreeNode(7));
const child3 = new TreeNode(4);
child3.addChildren(new TreeNode(8), new TreeNode(9));

root.addChildren(child1, child2, child3);

// Get nodes within a specified depth range
const nodesDepth1To2 = getNodesInDepthRange(root, 1, 2);
console.log('Nodes in depth range 1 to 2:', nodesDepth1To2);
