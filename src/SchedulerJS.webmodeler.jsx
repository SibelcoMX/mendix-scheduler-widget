import { Component, createElement } from "react";

export class preview extends Component {
    render() {
        return <h3 style={{textAlign: 'center'}}>SchedulerJS {this.props.sampleText}</h3>;
    }
}

export function getPreviewCss() {
    return require("./ui/SchedulerJS.css");
}
