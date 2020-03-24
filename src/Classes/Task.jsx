export class Task {
    constructor(task) {
        this.id = task.getGuid();
        this.title = task.get("Title");
        this.description = task.get('Description');
        this.start = task.get("StartDate");
        this.end = task.get("EndDate");
        this.bgColor = task.get("BgColor");
        this.showPopover = task.get("ShowTooltip");
        this.resizable = task.get("Resizable");
        this.startResizable = task.get("StartResizable");
        this.endResizable = task.get("EndResizable");
        this.movable = task.get("Movable");
        this.resourceId = task.get("ResourceID");
        this.isVacation = task.get("IsVacation");
        this.orderNumber = task.get("OrderNumber");
        this.employeeNumber = task.get("EmployeeNumber");
        this.operationID = task.get("OperationID");
    }
}