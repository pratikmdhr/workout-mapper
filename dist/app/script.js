'use strict';

// prettier-ignore

const form = document.querySelector('#form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const inputFormCancelBtn = document.querySelector('.form__btn__cancel');

const overlay = document.querySelector('.overlay');
const modal = document.querySelector('.modal');

const editForm = document.querySelector('#edit-form');
const editInputType = document.querySelector('.edit-form__input--type');
const editInputDistance = document.querySelector('.edit-form__input--distance');
const editInputDuration = document.querySelector('.edit-form__input--duration');
const editInputCadence = document.querySelector('.edit-form__input--cadence');
const editInputElevation = document.querySelector(
  '.edit-form__input--elevation'
);
const editInputFormCancelBtn = document.querySelector(
  '.edit-form__btn__cancel'
);
const toggleItem = document.querySelectorAll('.form__row');

// let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in KM
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}, ${this.date.getFullYear()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // this.type = 'running';
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  //private properties
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workoutsLayer = { tempMarkerId: null };
  #workouts = [];
  #editWorkoutIndex = null;
  #editEl;

  constructor() {
    // this gets called as soon as the new object is created
    this._getPostion();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    editForm.addEventListener('submit', this._editWorkout.bind(this));
    inputType.addEventListener('change', this._toggleInputFormElevationField);
    editInputType.addEventListener(
      'change',
      this._toggleEditFormElevationField
    );
    containerWorkouts.addEventListener('click', e => {
      if (e.target.classList.contains('edit-form__btn')) {
        this._showEditForm(e);
        return;
      }
      if (e.target.classList.contains('delete__btn')) {
        this._deleteWorkout(e);
        return;
      }
      this._moveToPopup.bind(this)(e);
    });
    inputFormCancelBtn.addEventListener(
      'click',
      this._inputFormCancelBtnHandler.bind(this)
    );
    [overlay, editInputFormCancelBtn].forEach(item => {
      item.addEventListener('click', this._hideEditForm);
    });
    // overlay.addEventListener('click', this._hideEditForm);
  }

  _getPostion() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        // Set default value for location if the user declines location sharing
        this._loadMap.bind(this, {
          coords: {
            latitude: 43.655913,
            longitude: -79.381089,
          },
        })
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // 13 is the zoon level

    L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      }
    ).addTo(this.#map);

    // L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    //   attribution:
    //     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // }).addTo(this.#map);

    // leaflet Event listener
    this.#map.on('click', this._showForm.bind(this));

    // Load markers for workouts in the local storage
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    const tempCoords = mapE.latlng;
    if (!this.#workoutsLayer.tempMarkerId) {
      this.#workoutsLayer.tempMarkerId = L.marker(tempCoords).addTo(this.#map);
    } else {
      this.#map.removeLayer(this.#workoutsLayer.tempMarkerId);
      this.#workoutsLayer.tempMarkerId = L.marker(tempCoords).addTo(this.#map);
    }
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty Input Values
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _inputFormCancelBtnHandler() {
    this.#map.removeLayer(this.#workoutsLayer.tempMarkerId);
    this.#workoutsLayer.tempMarkerId = null;
    this._hideForm();
  }

  _toggleInputFormElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _toggleEditFormElevationField() {
    editInputElevation
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
    editInputCadence
      .closest('.form__row')
      .classList.toggle('form__row--hidden');

    console.log(editInputElevation);
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositive = (...inputs) => inputs.every(input => input > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workoutColorClass;
    let workout;
    let popupContent;
    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if the data is valid

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout Array
    this.#workouts.push(workout);

    // Render workout on the list
    console.log(workout);
    this._renderWorkout(workout);

    // Remove temporary marker
    this.#map.removeLayer(this.#workoutsLayer.tempMarkerId);
    this.#workoutsLayer.tempMarkerId = null;

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Hide form + Clear input field
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _editWorkout(e) {
    let newWorkout;
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositive = (...inputs) => inputs.every(input => input > 0);
    e.preventDefault();
    const oldWorkout = { ...this.#workouts[this.#editWorkoutIndex] };

    // Get data from form
    const newType = editInputType.value;
    const newDistance = +editInputDistance.value;
    const newDuration = +editInputDuration.value;

    if (newType === 'running') {
      const newCadence = +editInputCadence.value;
      // Check if the data is valid

      if (
        !validInputs(newDistance, newDuration, newCadence) ||
        !allPositive(newDistance, newDuration, newCadence)
      )
        return alert('Inputs have to be positive numbers');
      newWorkout = new Running(
        oldWorkout.coords,
        newDistance,
        newDuration,
        newCadence
      );
      const newDescriptionArr = oldWorkout.description.split(' ');
      newDescriptionArr[0] = 'Running';
      newWorkout.coords = oldWorkout.coords;
      newWorkout.date = oldWorkout.date;
      newWorkout.description = newDescriptionArr.join(' ');
      newWorkout.id = oldWorkout.id;
    }
    // If workout is cycling, create cycling object
    if (newType === 'cycling') {
      const newElevation = +editInputElevation.value;
      if (
        !validInputs(newDistance, newDuration, newElevation) ||
        !allPositive(newDistance, newDuration)
      )
        return alert('Inputs have to be positive numbers');
      newWorkout = new Cycling(
        oldWorkout.coords,
        newDistance,
        newDuration,
        newElevation
      );
      const newDescriptionArr = oldWorkout.description.split(' ');
      newDescriptionArr[0] = 'Cycling';
      newWorkout.coords = oldWorkout.coords;
      newWorkout.date = oldWorkout.date;
      newWorkout.description = newDescriptionArr.join(' ');
      newWorkout.id = oldWorkout.id;
    }

    this.#workouts[this.#editWorkoutIndex] = { ...newWorkout };
    // Render workout on the list
    this._renderWorkout(newWorkout);

    // Delete old workout from display, and reset the variable
    this.#editEl.remove();
    this.#editEl = null;

    // Set local storage to all workouts
    this._setLocalStorage();

    this._hideEditForm();
  }

  _showEditForm(e) {
    overlay.classList.remove('modal--hidden');
    modal.classList.remove('modal--hidden');
    this.#editEl = e.target.closest('.workout');
    this.#editWorkoutIndex = this.#workouts.findIndex(
      work => work.id === this.#editEl.dataset.id
    );
  }
  _hideEditForm() {
    editInputDistance.value =
      editInputDuration.value =
      editInputCadence.value =
      editInputElevation.value =
        '';
    overlay.classList.add('modal--hidden');
    modal.classList.add('modal--hidden');
  }

  _deleteWorkout(e) {
    const workoutToDel = e.target.closest('.workout');

    this.#workouts = this.#workouts.filter(
      workout => workout.id !== workoutToDel.dataset.id
    );
    console.log(this.#workouts);
    workoutToDel.remove();
    this.#map.removeLayer(this.#workoutsLayer[workoutToDel.dataset.id]);
    delete this.#workoutsLayer[workoutToDel.dataset.id];
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    this.#workoutsLayer[workout.id] = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description
          .split(' ')
          .slice(2, 4)
          .join(' ')
          .slice(0, -1)}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__btn__container">
        <i class="fas fa-edit edit-form__btn"></i>
        <i class="fas fa-trash-alt delete__btn"></i>
      </div>
      <div class="workout__details__container">
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : `🚴‍♀️`
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;
    if (workout.type === 'running') {
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">👣️</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
  </div>
</li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
  </div>
</li>`;
    }

    if (this.#editEl) {
      this.#editEl.insertAdjacentHTML('beforebegin', html);
      return;
    }
    containerWorkouts.insertAdjacentHTML('afterbegin', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
