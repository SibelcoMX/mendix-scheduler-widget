import { Component, createElement, Fragment } from "react";
import PropTypes from 'prop-types';
import "../ui/SearchField.css";

export class SearchField extends Component {
    constructor(props) {
        super(props);
        this.state = {
          activeSuggestion: 0,
          filteredSuggestions: [],
          showSuggestions: false,
          userInput: ''
        };
    }
  static propTypes = {};

  static defaultProperty={
    suggestions: []
  };

  render(){
    const {
        onChange,
        onClick,
        onKeyDown,
        state: {
          activeSuggestion,
          filteredSuggestions,
          showSuggestions,
          userInput
        }
      } = this;
    let suggestionsListComponent;
    if (showSuggestions && userInput) {
      if (filteredSuggestions.length) {
        suggestionsListComponent = (
          <ul class="autocomplete-items">
            {filteredSuggestions.map((suggestion, index) => {
              
              return (
                <li
                    key={suggestion} 
                    onClick={onClick}>
                    {suggestion}
                </li>
              );
            })}
          </ul>
        );
      } else {
        suggestionsListComponent = (
          <div class="no-suggestions">
            <em>No suggestions!</em>
          </div>
        );
      }
    }
    return (
       <div className="autocomplete">
           {/* <label style ={{marginLeft: '20px', marginRight: '10px'}}>Search: </label> */}
         <input
         class="searchField"
           type="text"
           onChange={onChange}
           onKeyDown={onKeyDown}
           value={userInput}
           placeholder="Search"
         />
         {suggestionsListComponent}
       </div>
     );
 };

 onChange = (e) => {
    const { suggestions } = this.props;
    const userInput = e.currentTarget.value;

    const filteredSuggestions = suggestions.filter(
      (suggestion) =>
        suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
    );

    this.setState({
      activeSuggestion: 0,
      filteredSuggestions,
      showSuggestions: true,
      userInput: e.currentTarget.value
    });
  };

  onClick = (e) => {
    this.setState({
      activeSuggestion: 0,
      filteredSuggestions: [],
      showSuggestions: false,
      userInput: e.currentTarget.innerText
    });
    this.props.handleSearch(e.currentTarget.innerText);
  };

  onKeyDown = e => {
    const { activeSuggestion, filteredSuggestions } = this.state;

    if (e.keyCode === 13) {
      this.setState({
        activeSuggestion: 0,
        showSuggestions: false,
        userInput: filteredSuggestions[activeSuggestion]
      });
      this.props.handleSearch(filteredSuggestions[activeSuggestion]);
    }
    else if (e.keyCode === 38) {
      if (activeSuggestion === 0) {
        return;
      }

      this.setState({ activeSuggestion: activeSuggestion - 1 });
    }
    else if (e.keyCode === 40) {
      if (activeSuggestion - 1 === filteredSuggestions.length) {
        return;
      }

      this.setState({ activeSuggestion: activeSuggestion + 1 });
    }
  };

}
export default SearchField;