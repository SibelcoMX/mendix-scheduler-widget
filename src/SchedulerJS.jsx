import { Component, createElement } from "react";
import Scheduler, { CellUnits, SchedulerData, ViewTypes } from "react-big-scheduler";
import "react-big-scheduler/lib/css/style.css";
import moment from "moment";
import withDragDropContext from "./components/withDnDContext";

import "./ui/SchedulerJS.css";

class SchedulerJS extends Component {

    constructor(props) {
        super(props);

        moment.locale("en", {
            week: {
                dow: 1,
                doy: 4
            }
        });

        const schedulerData = new SchedulerData(
            new moment(new Date()).format("YYYY-MM-DD"),
            ViewTypes.Week,
            false,
            false,
            {
                schedulerWidth: "90%",
                nonAgendaDayCellHeaderFormat: "HH:mm",
                views: [
                    { viewName: "Day", viewType: ViewTypes.Day, showAgenda: false, isEventPerspective: false },
                    { viewName: "Week", viewType: ViewTypes.Week, showAgenda: false, isEventPerspective: false },
                    { viewName: "Month", viewType: ViewTypes.Month, showAgenda: false, isEventPerspective: false }
                ]
            },
            {
                isNonWorkingTimeFunc: this.isNonWorkingTime
            },
            moment
        );

        this.state = {
            viewModel: schedulerData
        };

        // Set resources
        this.setResources(schedulerData);

        // Set tasks
        this.setTasks(schedulerData);
    }

    getObjectContext = obj => {
        const context = new mendix.lib.MxContext();
        context.setContext(obj.getEntity(), obj.getGuid());
        return context;
    };

    getContext = obj => {
        if (obj && obj.getGuid) {
            return getObjectContext(obj);
        } else if (this.props.mxObject) {
            return this.getObjectContext(this.props.mxObject);
        }

        return new window.mendix.lib.MxContext();
    };

    async executeMicroflow(microFlow, context, origin) {
        return new Promise((resolve, reject) => {
            if (!microFlow || microFlow === "") {
                return reject(new Error("Microflow parameter cannot be empty!"));
            }
            try {
                window.mx.data.action({
                    params: {
                        actionname: microFlow
                    },
                    context: context,
                    origin: origin,
                    callback: resolve,
                    error: reject
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    setResources = (schedulerData) => {
        const { mxform } = this.props;
        const context = this.getContext();
        this.executeMicroflow(this.props.resourceSource, context, mxform)
            .then((mxObjects) => {
                var resources = [];
                this.debug("Received resources", mxObjects.length);
                mxObjects.forEach(resource =>
                    resources.push({
                        id: resource.get("ResourceID"),
                        name: resource.get("Name"),
                        groupOnly: resource.get("GroupOnly"),
                        parentId: resource.get("ParentID")
                    })
                );
                schedulerData.setResources(resources);
                this.setState({
                    viewModel: schedulerData
                });
            })
            .catch (error => {
                this.showMendixError(`handle set Resources`, error);
            });
    }

    setTasks(schedulerData) {
        const { mxform } = this.props;
        const context = this.getContext();
        this.executeMicroflow(this.props.taskSource, context, mxform)
            .then((mxObjects) => {
                var tasks = [];
                this.debug("Received tasks", mxObjects.length);
                mxObjects.forEach(task =>
                    tasks.push({
                        id: task.get("TaskID"),
                        start: task.get("StartDate"),
                        end: task.get("EndDate"),
                        title: task.get("Title"),
                        bgColor: task.get("BgColor"),
                        showPopover: task.get("ShowTooltip"),
                        resizable: task.get("Resizable"),
                        startResizable: task.get("StartResizable"),
                        endResizable: task.get("EndResizable"),
                        movable: task.get("Movable"),
                        resourceId: task.get("ResourceID")
                    })
                );
                schedulerData.setEvents(tasks);
                this.setState({
                    viewModel: schedulerData
                });
            })
            .catch (error => {
                this.showMendixError(`handle set Tasks`, error);
            });
    }

    nonAgendaCellHeaderTemplateResolver = (schedulerData, item, formattedDateItems, style) => {
        const datetime = schedulerData.localeMoment(item.time);
        let isCurrentDate = false;

        if (schedulerData.viewType === ViewTypes.Day) {
            isCurrentDate = datetime.isSame(new Date(), "hour");
        } else {
            isCurrentDate = datetime.isSame(new Date(), "day");
        }

        if (isCurrentDate) {
            style.backgroundColor = "#118dea";
            style.color = "white";
        }

        return (
            <th key={item.time} className={"header3-text"} style={style}>
                {formattedDateItems.map((formattedItem, index) => (
                    <div
                        key={index}
                        dangerouslySetInnerHTML={{ __html: formattedItem.replace(/[0-9]/g, "<b>$&</b>") }}
                    />
                ))}
            </th>
        );
    };

    render() {
        const { viewModel } = this.state;

        return (
            <Scheduler
                schedulerData={viewModel}
                prevClick={this.prevClick}
                nextClick={this.nextClick}
                onSelectDate={this.onSelectDate}
                onViewChange={this.onViewChange}
                eventItemClick={this.eventClicked}
                viewEventText="Unplan"
                viewEventClick={this.unplan}
                viewEvent2Text="Open in SAP"
                viewEvent2Click={this.openSAP}
                updateEventStart={this.updateEventStart}
                updateEventEnd={this.updateEventEnd}
                moveEvent={this.moveEvent}
                onScrollLeft={this.onScrollLeft}
                onScrollRight={this.onScrollRight}
                onScrollTop={this.onScrollTop}
                onScrollBottom={this.onScrollBottom}
                nonAgendaCellHeaderTemplateResolver={this.nonAgendaCellHeaderTemplateResolver}
                toggleExpandFunc={this.toggleExpandFunc}
            />
        );
    }

    updateTask(taskId, startDate, endDate, oldSlotId, newSlotId) {
        // Update task
        mx.data.get({
            guid: taskId,
            callback: function(obj) {
                obj.set("StartDate", moment(startDate, "YYYY-MM-DD HH:mm:ss").toDate());
                obj.set("EndDate", moment(endDate, "YYYY-MM-DD HH:mm:ss").toDate());
                if (newSlotId !== oldSlotId) {
                    if (newSlotId === "0") obj.removeReferences("TestApp.Task_Resource", [newSlotId]);
                    else obj.addReference("TestApp.Task_Resource", newSlotId);
                }
                // and commit
                mx.data.commit({
                    mxobj: obj,
                    callback: function() {
                        this.debug("Object committed");
                    },
                    error: function(error) {
                        this.debug("Could not commit object:", error);
                    }
                });
            }
        });
    }

    prevClick = schedulerData => {
        schedulerData.prev();
        this.setTasks(schedulerData);
    };

    nextClick = schedulerData => {
        schedulerData.next();
        this.setTasks(schedulerData);
    };

    onViewChange = (schedulerData, view) => {
        schedulerData.setViewType(view.viewType, view.showAgenda, view.isEventPerspective);
        this.setTasks(schedulerData);
    };

    onSelectDate = (schedulerData, date) => {
        schedulerData.setDate(date);
        this.setTasks(schedulerData);
    };

    eventClicked = (schedulerData, event) => {
        alert(`You just clicked an event: {id: ${event.id}, title: ${event.title}}`);
    };

    unplan = (schedulerData, event) => {
        if (confirm(`Do you want to unplan this task? {eventId: ${event.id}, eventTitle: ${event.title}}`)) {
            this.debug("Event", event);
            // Update task
            this.updateTask(
                event.id,
                schedulerData.localeMoment(event.start),
                schedulerData.localeMoment(event.end),
                event.resourceId,
                "0"
            );
            schedulerData.moveEvent(event, "0", event.title, event.start, event.end);
            this.setState({
                viewModel: schedulerData
            });
        }
    };

    openSAP = (schedulerData, event) => {
        alert(`Show in SAP: {id: ${event.id}, title: ${event.title}}`);
    };

    updateEventStart = (schedulerData, event, newStart) => {
        if (
            confirm(
                `Do you want to adjust the start of the event? {eventId: ${event.id}, eventTitle: ${event.title}, newStart: ${newStart}}`
            )
        ) {
            schedulerData.updateEventStart(event, newStart);
        }
        this.setState({
            viewModel: schedulerData
        });
    };

    updateEventEnd = (schedulerData, event, newEnd) => {
        if (
            confirm(
                `Do you want to adjust the end of the event? {eventId: ${event.id}, eventTitle: ${event.title}, newEnd: ${newEnd}}`
            )
        ) {
            schedulerData.updateEventEnd(event, newEnd);
        }
        this.setState({
            viewModel: schedulerData
        });
    };

    moveEvent = (schedulerData, event, slotId, slotName, start, end) => {
        if (
            confirm(
                `Do you want to move the event? {eventId: ${event.id}, eventTitle: ${event.title}, newSlotId: ${slotId}, newSlotName: ${slotName}, newStart: ${start}, newEnd: ${end}`
            )
        ) {
            const { localeMoment } = schedulerData;
            const dayOfWeek = localeMoment(start).weekday();
            const startHour = localeMoment(start).hour();
            if (
                ((this.props.showWeekend.value ||
                    (!this.props.showWeekend.value && dayOfWeek >= 1 && dayOfWeek <= 5)) &&
                    startHour >= localeMoment(this.props.workStartTime.value).hour() &&
                    startHour <= localeMoment(this.props.workEndTime.value).hour()) ||
                this.props.allowOutsideHoursPlanning.value
            ) {
                // Update task
                this.updateTask(event.id, start, end, event.resourceId, slotId);
                schedulerData.moveEvent(event, slotId, slotName, start, end);
                this.setState({
                    viewModel: schedulerData
                });
            } else {
                alert("Unable to plan outside working hours.");
            }
        }
    };

    onScrollRight = (schedulerData, schedulerContent, maxScrollLeft) => {
        if (schedulerData.ViewTypes === ViewTypes.Day) {
            schedulerData.next();
            this.setTasks(schedulerData);
            schedulerContent.scrollLeft = maxScrollLeft - 10;
        }
    };

    onScrollLeft = (schedulerData, schedulerContent, maxScrollLeft) => {
        if (schedulerData.ViewTypes === ViewTypes.Day) {
            schedulerData.prev();
            this.setTasks(schedulerData);
            schedulerContent.scrollLeft = 10;
        }
    };

    onScrollTop = (schedulerData, schedulerContent, maxScrollTop) => {
        console.log("onScrollTop");
    };

    onScrollBottom = (schedulerData, schedulerContent, maxScrollTop) => {
        console.log("onScrollBottom");
    };

    isNonWorkingTime = (schedulerData, time) => {
        const { localeMoment } = schedulerData;
        if (schedulerData.cellUnit === CellUnits.Hour) {
            const hour = localeMoment(time).hour();
            if (
                hour < localeMoment(this.props.workStartTime.value).hour() ||
                hour > localeMoment(this.props.workEndTime.value).hour()
            )
                return true;
        } else {
            const dayOfWeek = localeMoment(time).weekday();
            if (!this.props.showWeekend.value && (dayOfWeek === 5 || dayOfWeek === 6)) return true;
        }

        return false;
    };

    toggleExpandFunc = (schedulerData, slotId) => {
        schedulerData.toggleExpandStatus(slotId);
        this.setState({
            viewModel: schedulerData
        });
    };

    debug = (...args) => {
//        const id = this.props.friendlyId || this.widgetId;
        if (window.logger) {
            window.logger.debug(...args);
        }
    }

    showMendixError = (actionName, error) => {
        if (error && error.message) {
            window.mx.ui.error(`An error occured in ${actionName} :: ${error.message}`);
        }
    }
}

export default withDragDropContext(SchedulerJS);
