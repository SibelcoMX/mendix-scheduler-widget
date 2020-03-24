export class Resource {
    constructor(resource) {
        this.id = resource.get("ResourceID");
        this.name = resource.get("Name");
        this.parentId = resource.get("ParentID");
        this.groupOnly= resource.get("GroupOnly");
        this.isUnplan = resource.get("ResourceID").startsWith("u") ? true : false;
    }
}
