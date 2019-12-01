import { Component, createElement } from "react";
import Scheduler, { CellUnits, SchedulerData, ViewTypes } from "react-big-scheduler";
import "react-big-scheduler/lib/css/style.css";
import moment from "moment";
import withDragDropContext from "./components/withDnDContext";
import "./components/mendixUtils"

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
    }

    setResources = (schedulerData) => {
        executeMicroflow(this.props.resourceSource)
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
                showMendixError(`setResources`, error);
            });
    }

    setTasks = (schedulerData) => {
        executeMicroflow(this.props.taskSource)
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
                showMendixError(`setTasks`, error);
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

    componentDidMount = () => {
        var schedulerData = this.state.viewModel;
        this.setResources(schedulerData);
        this.setTasks(schedulerData);
    }

    componentDidUpdate = (prevProps) => {
        var schedulerData = this.state.viewModel;
        if (this.props.startDate.value !== prevProps.startDate.value
            || this.props.endDate.value !== prevProps.endDate.value
            || this.props.planningArea.value !== prevProps.planningArea.value) {
            // Set tasks
            this.debug('componentDidUpdate');
            this.setTasks(schedulerData);
        }
    }
 
    render = () => {
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

    updateTask = (taskId, startDate, endDate, oldSlotId, newSlotId) => {
        // Update task
        getObject(taskId)
            .then((mxObject) => {
                mxObject.set("StartDate", moment(startDate, "YYYY-MM-DD HH:mm:ss").toDate());
                mxObject.set("EndDate", moment(endDate, "YYYY-MM-DD HH:mm:ss").toDate());
                if (newSlotId !== oldSlotId) {
                    if (newSlotId === "0") mxObject.removeReferences("TestApp.Task_Resource", [newSlotId]);
                    else mxObject.addReference("TestApp.Task_Resource", newSlotId);
                }
                commitObject(mxObject)
                    .catch(error => {
                        showMendixError('updateTask, commitObject', error);
                    })
            })
            .catch(error => {
                showMendixError('updateTask, getObject', error);
            });
    }

    updateDateRange = (startDate, endDate) => {
        this.debug('dateRange', 'startDate:', startDate, 'endDate', endDate);
        this.props.startDate.setValue(moment(startDate, "YYYY-MM-DD").toDate());
        this.props.endDate.setValue(moment(endDate, "YYYY-MM-DD").toDate());
    };

    prevClick = schedulerData => {
        schedulerData.prev();
        this.updateDateRange(schedulerData.startDate, schedulerData.endDate);
    };

    nextClick = schedulerData => {
        schedulerData.next();
        this.updateDateRange(schedulerData.startDate, schedulerData.endDate);
    };

    onViewChange = (schedulerData, view) => {
        schedulerData.setViewType(view.viewType, view.showAgenda, view.isEventPerspective);
        this.updateDateRange(schedulerData.startDate, schedulerData.endDate);
    };

    onSelectDate = (schedulerData, date) => {
        schedulerData.setDate(date);
        this.updateDateRange(schedulerData.startDate, schedulerData.endDate);
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
                showMendixError("Unable to plan outside working hours.");
            }
        }
    };

    onScrollRight = (schedulerData, schedulerContent, maxScrollLeft) => {
        if (schedulerData.ViewTypes === ViewTypes.Day) {
            schedulerData.next();
            this.updateDateRange(schedulerData.startDate, schedulerData.endDate);
            schedulerContent.scrollLeft = maxScrollLeft - 10;
        }
    };

    onScrollLeft = (schedulerData, schedulerContent, maxScrollLeft) => {
        if (schedulerData.ViewTypes === ViewTypes.Day) {
            schedulerData.prev();
            this.updateDateRange(schedulerData.startDate, schedulerData.endDate);
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
        if (window.logger) {
            //window.logger.debug(`${this.props.name}:`, ...args);
            window.logger.debug(...args);
        }
    }

}

export default withDragDropContext(SchedulerJS);
