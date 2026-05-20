async function loadCards(

 start,

 end

){

 const wrapper=

 document.getElementById(

 'event-cards'

 );

 if(

 !wrapper

 ) return;

 const {

 data,

 error

 }=

 await supabaseClient

 .from('Termine')

 .select('*');

 if(

 error

 ){

 console.error(error);

 return;

 }

 wrapper.innerHTML='';

 const events=

 data

 .filter(

 item=>{

 if(

 item.recurring

 )

 return true;

 const date=

 new Date(

 item.date

 );

 return(

 date>=start &&

 date<end

 );

 }

 )

 .sort(

 (a,b)=>{

const first=

a.date ||

`${new Date().getFullYear()}-01-01`;

const second=

b.date ||

`${new Date().getFullYear()}-01-01`;

 return new Date(

 first

 )

 -

 new Date(

 second

 );

 }

 );

 events.forEach(

 event=>{

 const card=

 document

 .createElement(

 'article'

 );

 card.className=

 'calendar-card';

 card.innerHTML=

 `

<a

href=

"/event.html?slug=

${event.slug}"

>

<div

class=

"calendar-dot"

></div>

<div>

<h3>

${event.title}

</h3>

<p>

${formatCardDate(

event

)}

</p>

</div>

</a>

`;

 wrapper

 .appendChild(

 card

 );

 }

 );

}