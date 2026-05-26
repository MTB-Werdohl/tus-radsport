const eventSources = [

{
  events: async function(fetchInfo, successCallback, failureCallback) {

    try {

      const { data, error } = await supabaseClient
        .from('Termine')
        .select('*');

      if (error) {
        throw error;
      }

      const events = data.map(item => {

        const baseEvent = {

          title: item.title,

          description: item.description,

          location: item.location,

          url: '/events/' + item.slug + '/',

          backgroundColor: '#2e8b57',

          borderColor: '#2e8b57',

          extendedProps: {
            exclude: item.exclude || []
          }

        };

        if (item.recurring) {

          return {

            ...baseEvent,

            daysOfWeek: item.daysOfWeek,

            startTime: item.startTime,

            startRecur: item.startRecur,

            endRecur: item.endRecur

          };

        }

        return {

          ...baseEvent,

          start: item.date

        };

      });

      successCallback(events);

    } catch(error) {

      console.error(error);

      failureCallback(error);

    }

  }
},

{
  events: async function(fetchInfo, successCallback, failureCallback) {

    try {

      const response = await fetch(
        'https://openholidaysapi.org/PublicHolidays' +
        '?countryIsoCode=DE' +
        '&subdivisionCode=DE-NW' +
        '&languageIsoCode=DE' +
        `&validFrom=${validFrom}` +
        `&validTo=${validTo}`
      );

      const data = await response.json();

      const holidays = data.map(item => ({

        title: item.name[0].text,

        start: item.startDate,

        end: item.endDate,

        display: 'background',

        extendedProps: {
          isInfoEvent: true
        },

        backgroundColor: '#c0392b',

        borderColor: '#c0392b',

        textColor: '#ffffff'

      }));

      successCallback(holidays);

    } catch(error) {

      failureCallback(error);

    }

  }
},

{
  events: async function(fetchInfo, successCallback, failureCallback) {

    try {

      const response = await fetch(
        'https://openholidaysapi.org/SchoolHolidays' +
        '?countryIsoCode=DE' +
        '&subdivisionCode=DE-NW' +
        '&languageIsoCode=DE' +
        `&validFrom=${validFrom}` +
        `&validTo=${validTo}`
      );

      const data = await response.json();

      const holidays = data.map(item => ({

        title: item.name[0].text,

        start: item.startDate,

        end: item.endDate,

        display: 'background',

        extendedProps: {
          isInfoEvent: true
        },

        backgroundColor: '#f1c40f',

        borderColor: '#f1c40f'

      }));

      successCallback(holidays);

    } catch(error) {

      failureCallback(error);

    }

  }
}

];