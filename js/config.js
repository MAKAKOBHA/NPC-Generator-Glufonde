export const categories = {
 man: {label:'Мужчина', gender:'male', min:18, max:80},
 woman: {label:'Женщина', gender:'female', min:18, max:80},
 boy: {label:'Мальчик', gender:'male', min:6, max:17},
 girl: {label:'Девочка', gender:'female', min:6, max:17}
};
export const presets = {
 normal:{label:'Обычная осведомлённость', weights:[45,20,20,10,5]},
 high:{label:'Повышенная осведомлённость', weights:[15,15,25,30,15]},
 uniform:{label:'Равномерная осведомлённость', weights:[20,20,20,20,20]}
};
export const awareness = [
 ['Ничего не знает','Не располагает сведениями по теме текущего сюжета.'],
 ['Знает имя','Узнаёт имя, организацию, место или событие, но не знает существенных подробностей.'],
 ['Знает немного','Может сообщить небольшой факт, слух или наблюдение. Содержание определяет мастер.'],
 ['Знает больше среднего','Знает несколько связанных фактов или обстоятельств. Содержание определяет мастер.'],
 ['Знает много','Располагает существенной информацией, полезной для расследования. Содержание определяет мастер.']
];
export const fields = {name:'Имя и фамилия',age:'Возраст',birthplace:'Место рождения',appearance:'Внешность',distinctive:'Одежда и приметы',voice:'Голос и подача',verbal:'Речевая привычка',habit:'Поведенческая привычка',profession:'Занятие',mood:'Настроение',awareness:'Осведомлённость'};
export const dataFiles=['names','surnames','locations','appearance','speech','habits','professions','moods'];
export const historyLimit=30;
export const retryLimit=16;
