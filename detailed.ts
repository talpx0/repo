class TreeNode {
    value: number;
    children: TreeNode[];

    constructor(value: number) {
        this.value = value;
        this.children = [];
    }
}

class NaryTree {
    root: TreeNode;

    constructor(root: TreeNode) {
        this.root = root;
    }

    addNode(parentValue: number, newValue: number) {
        // Simplified add node logic
        const newNode = new TreeNode(newValue);
        const parentNode = this.findNode(this.root, parentValue);
        if (parentNode) parentNode.children.push(newNode);
    }

    removeNode(value: number) {
        // Simplified remove logic
        this.root = this.removeNodeRecursive(this.root, value);
    }

    private removeNodeRecursive(node: TreeNode | null, value: number): TreeNode | null {
        if (!node) return null;
        if (node.value === value) return null;

        node.children = node.children
            .map(child => this.removeNodeRecursive(child, value))
            .filter(child => child !== null) as TreeNode[];
        
        return node;
    }

    findNode(node: TreeNode | null, value: number): TreeNode | null {
        if (!node) return null;
        if (node.value === value) return node;

        for (const child of node.children) {
            const found = this.findNode(child, value);
            if (found) return found;
        }

        return null;
    }

    traversePreOrder(node: TreeNode | null, action: (node: TreeNode) => void) {
        if (!node) return;
        action(node);
        node.children.forEach(child => this.traversePreOrder(child, action));
    }

    // ... and more methods
}


class TreeTraversalHelper {
    preOrderTraversal(node: TreeNode | null, action: (node: TreeNode) => void) {
        if (!node) return;
        action(node);
        node.children.forEach(child => this.preOrderTraversal(child, action));
    }

    postOrderTraversal(node: TreeNode | null, action: (node: TreeNode) => void) {
        if (!node) return;
        node.children.forEach(child => this.postOrderTraversal(child, action));
        action(node);
    }
}

class NodeManagementHelper {
    addNode(root: TreeNode, parentValue: number, newValue: number) {
        const newNode = new TreeNode(newValue);
        const parentNode = this.findNode(root, parentValue);
        if (parentNode) parentNode.children.push(newNode);
    }

    removeNode(root: TreeNode, value: number): TreeNode | null {
        return this.removeNodeRecursive(root, value);
    }

    private removeNodeRecursive(node: TreeNode | null, value: number): TreeNode | null {
        if (!node) return null;
        if (node.value === value) return null;

        node.children = node.children
            .map(child => this.removeNodeRecursive(child, value))
            .filter(child => child !== null) as TreeNode[];
        
        return node;
    }

    findNode(node: TreeNode | null, value: number): TreeNode | null {
        if (!node) return null;
        if (node.value === value) return node;

        for (const child of node.children) {
            const found = this.findNode(child, value);
            if (found) return found;
        }

        return null;
    }
}


class NaryTree {
    root: TreeNode;
    private traversalHelper: TreeTraversalHelper;
    private nodeManagementHelper: NodeManagementHelper;

    constructor(root: TreeNode) {
        this.root = root;
        this.traversalHelper = new TreeTraversalHelper();
        this.nodeManagementHelper = new NodeManagementHelper();
    }

    addNode(parentValue: number, newValue: number) {
        this.nodeManagementHelper.addNode(this.root, parentValue, newValue);
    }

    removeNode(value: number) {
        this.root = this.nodeManagementHelper.removeNode(this.root, value) || this.root;
    }

    traversePreOrder(action: (node: TreeNode) => void) {
        this.traversalHelper.preOrderTraversal(this.root, action);
    }

    traversePostOrder(action: (node: TreeNode) => void) {
        this.traversalHelper.postOrderTraversal(this.root, action);
    }

    // ... other methods delegating to helpers
}
