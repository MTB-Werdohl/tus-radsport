async function loadCards(
  start,
  end
){

  const wrapper =
    document.getElementById(
      'event-cards'
    );

  if (!wrapper) return;

  const { data, error } =

    await supabaseClient

      .from('Termine')

      .select('*');

  if (error){

    console.error(error);

    return;

  }

  wrapper.innerHTML='';

  const cards=[];

  const categories = {

    training:{

      color:'#2e8b57',

      icon:'🚵'

    },

    vereinsleben:{

      color:'#f1c40f',

      icon:'🎉'

    },

    race:{

      color:'#e74c3c',

      icon:'🏁'

    },

    flex:{

      color:'#3498db',

      icon:'🔄'

    },

    event:{

      color:'#9b59b6',

      icon:'📅'

    }

  };

  data.forEach(item=>{

    if(item.recurring){

      const current=
        new Date(start);

      while(current<end){

        const date=

`${

current.getFullYear()

}-${
String(
current.getMonth()+1
).padStart(
2,
'0'
)

}-${
String(
current.getDate()
).padStart(
2,
'0'
)

}`;

        const excluded=

          item.exclude
          ?.includes(date);

        const validDay=

          item.daysOfWeek
          ?.includes(
            current.getDay()
          );

        if(

          validDay &&

          !excluded

        ){

          cards.push({

            ...item,

            generatedDate:

            new Date(current)

          });

        }

        current.setDate(

          current.getDate()+1

        );

      }

      return;

    }

    const eventDate=

      new Date(item.date);

    if(

      eventDate>=start &&

      eventDate<end

    ){

      cards.push(item);

    }

  });

  cards.sort(

    (a,b)=>{

      const first=

        a.generatedDate ||

        new Date(a.date);

      const second=

        b.generatedDate ||

        new Date(b.date);

      return first-second;

    }

  );

  const now=
    new Date();

  const visibleCards=

    cards.filter(

      event=>{

        const date=

          event.generatedDate ||

          new Date(
            event.date
          );

        return date>=now;

      }

    );

  visibleCards.forEach(event=>{

    const card=

      document.createElement(
        'article'
      );

    card.className=

      'calendar-card';

    const category=

      categories[
        event.category
      ]

      ||

      {

        color:'#3498db',

        icon:'📍'

      };

    card.innerHTML=`

<a

href="/event.html?slug=${event.slug}"

>

<div

class="calendar-dot"

style="background:${category.color}"

></div>

<div>

<h3>

${category.icon}

${event.title}

</h3>

<p>

🗓️

${formatCardDate(event)}

${

event.location

?

` · 📍 ${event.location}`

:''

}

</p>

</div>

</a>

`;

    wrapper.appendChild(
      card
    );

  });

}