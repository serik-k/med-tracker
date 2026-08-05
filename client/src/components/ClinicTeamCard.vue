<template>
  <section class="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-6" aria-labelledby="team-title">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h2 id="team-title" class="flex items-center gap-2 text-lg font-black"><Users class="h-5 w-5 text-cyan-400" />Сотрудники клиники</h2><p class="mt-1 text-xs font-semibold text-slate-400">Роли, состояние доступа и восстановление учётных записей</p></div>
      <button ref="createTrigger" type="button" class="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 focus-visible:ring-4 focus-visible:ring-cyan-500/20" @click="openCreate"><UserPlus class="h-4 w-4" />Добавить сотрудника</button>
    </div>

    <div v-if="loading" class="grid min-h-36 place-items-center" role="status"><LoaderCircle class="h-6 w-6 animate-spin text-cyan-400" /></div>
    <div v-else-if="loadError" class="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-300" role="alert">{{ loadError }} <button type="button" class="ml-2 min-h-10 rounded-lg px-2 underline" @click="load">Повторить</button></div>
    <div v-else-if="!users.length" class="mt-5 rounded-2xl border border-dashed border-slate-700 p-8 text-center"><UserRound class="mx-auto h-7 w-7 text-slate-600" /><p class="mt-3 text-sm font-bold text-slate-400">Сотрудников пока нет</p></div>
    <div v-else class="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      <article v-for="user in users" :key="user.id" class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div class="flex items-start gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300"><UserRound class="h-4 w-4" /></span><div class="min-w-0"><h3 class="truncate text-sm font-black text-white">{{ user.name }}</h3><p class="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{{ user.email }}</p></div><span class="ml-auto shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase" :class="user.status === 'DISABLED' ? 'bg-red-500/10 text-red-300' : 'bg-cyan-500/10 text-cyan-300'">{{ userBadge(user) }}</span></div>
        <div v-if="user.role !== 'clinic_owner'" class="mt-4">
          <CustomSelect :model-value="user.role" :disabled="updatingId === user.id" label="Роль" :options="roleSelectOptions" @update:model-value="val => changeRole(user, val as 'dispatcher' | 'clinic_admin')" />
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button v-if="user.role !== 'clinic_owner'" type="button" class="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700 text-[11px] font-black text-slate-300 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-400" :disabled="updatingId === user.id" @click="requestToggleUser(user)"><UserCheck v-if="user.status === 'DISABLED'" class="h-3.5 w-3.5" /><UserX v-else class="h-3.5 w-3.5" />{{ user.status === 'DISABLED' ? 'Включить' : 'Отключить' }}</button>
          <span v-else class="flex min-h-10 items-center justify-center rounded-lg border border-slate-800 text-[11px] font-bold text-slate-600">Владелец</span>
          <button v-if="canReset(user)" type="button" class="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700 text-[11px] font-black text-slate-300 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-400" @click="openReset(user)"><KeyRound class="h-3.5 w-3.5" />Сменить пароль</button>
          <span v-else class="flex min-h-10 items-center justify-center rounded-lg border border-slate-800 text-[11px] font-bold text-slate-600">Пароль защищён</span>
        </div>
        <p v-if="rowErrors[user.id]" class="mt-3 text-[11px] font-bold text-red-300" role="alert">{{ rowErrors[user.id] }}</p>
      </article>
    </div>

    <div v-if="showCreate" class="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm" @click.self="closeCreate" @keydown.esc="closeCreate" @keydown.tab="trapFocus($event, createDialog)">
      <form ref="createDialog" class="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="new-user-title" @submit.prevent="createUser">
        <div class="flex items-start justify-between gap-4"><div><h3 id="new-user-title" class="text-lg font-black">Новый сотрудник</h3><p class="mt-1 text-xs font-semibold text-slate-500">Аккаунт будет привязан к этой клинике</p></div><button type="button" class="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white" aria-label="Закрыть" @click="closeCreate"><X class="h-5 w-5" /></button></div>
        <div class="mt-5 space-y-4">
          <label class="block text-xs font-black text-slate-300">ФИО<input ref="nameInput" v-model.trim="form.name" required autocomplete="name" class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none focus:border-cyan-400" /></label>
          <label class="block text-xs font-black text-slate-300">Email<input v-model.trim="form.email" type="email" inputmode="email" autocomplete="email" required class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none focus:border-cyan-400" /></label>
          <CustomSelect v-model="form.role" label="Роль" :options="roleSelectOptions" />
          <label class="block text-xs font-black text-slate-300">Начальный пароль<input v-model="form.password" type="password" minlength="10" autocomplete="new-password" required class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none focus:border-cyan-400" /><span class="mt-1.5 block text-[11px] font-semibold text-slate-500">Не менее 10 символов. Передайте безопасно и попросите сотрудника сразу сменить пароль в своём кабинете.</span></label>
          <label class="block text-xs font-black text-slate-300">Повторите пароль<input v-model="form.passwordConfirm" type="password" minlength="10" autocomplete="new-password" required class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none focus:border-cyan-400" /></label>
        </div>
        <p v-if="error" class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300" role="alert">{{ error }}</p>
        <div class="mt-6 flex justify-end gap-2"><button type="button" class="min-h-11 rounded-xl bg-slate-800 px-4 text-xs font-bold" @click="closeCreate">Отмена</button><button type="submit" :disabled="saving" class="min-h-11 rounded-xl bg-cyan-400 px-5 text-xs font-black text-slate-950 disabled:opacity-60">{{ saving ? 'Создание…' : 'Создать аккаунт' }}</button></div>
      </form>
    </div>

    <div v-if="resetUser" class="fixed inset-0 z-[75] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm" @click.self="closeReset" @keydown.esc="closeReset" @keydown.tab="trapFocus($event, resetDialog)">
      <form ref="resetDialog" class="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description" @submit.prevent="resetPassword">
        <div class="flex items-start justify-between">
          <div><h3 id="reset-title" class="text-lg font-black">{{ isSelfReset ? 'Сменить свой пароль' : 'Новый временный пароль' }}</h3><p id="reset-description" class="mt-1 text-xs text-slate-500">{{ isSelfReset ? 'Все ваши сессии завершатся; потребуется войти снова.' : resetUser.name }}</p></div>
          <button type="button" class="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-800" aria-label="Закрыть" @click="closeReset"><X class="h-4 w-4" /></button>
        </div>
        <div class="mt-5 space-y-3">
          <label v-if="isSelfReset" class="block text-xs font-black text-slate-300">Текущий пароль<input ref="resetCurrentInput" v-model="resetCurrentPassword" type="password" autocomplete="current-password" required class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-white outline-none focus:border-cyan-400" /></label>
          <label class="block text-xs font-black text-slate-300">Новый пароль<input ref="resetPasswordInput" v-model="resetPasswordValue" type="password" minlength="10" autocomplete="new-password" required class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-white outline-none focus:border-cyan-400" /></label>
          <label class="block text-xs font-black text-slate-300">Повторите пароль<input v-model="resetPasswordConfirm" type="password" minlength="10" autocomplete="new-password" required class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-white outline-none focus:border-cyan-400" /></label>
        </div>
        <p v-if="resetError" class="mt-3 text-xs font-bold text-red-300" role="alert">{{ resetError }}</p>
        <button type="submit" :disabled="resetSaving" class="mt-5 min-h-11 w-full rounded-xl bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-60">{{ resetSaving ? 'Сохраняем…' : isSelfReset ? 'Сменить и выйти' : 'Установить пароль' }}</button>
      </form>
    </div>

    <div v-if="disableUser" class="fixed inset-0 z-[76] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm" @click.self="closeDisable" @keydown.esc="closeDisable" @keydown.tab="trapFocus($event, disableDialog)">
      <div ref="disableDialog" class="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="disable-user-title" aria-describedby="disable-user-description">
        <span class="grid h-12 w-12 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300"><UserX class="h-6 w-6" /></span>
        <h3 id="disable-user-title" class="mt-5 text-lg font-black">Отключить сотрудника?</h3>
        <p id="disable-user-description" class="mt-2 text-sm font-medium leading-6 text-slate-400">Аккаунт <strong class="text-white">{{ disableUser.name }}</strong> сразу потеряет доступ. Его активные сессии и realtime-соединения будут отозваны.</p>
        <div class="mt-6 grid grid-cols-2 gap-2"><button type="button" :disabled="updatingId === disableUser.id" class="min-h-11 rounded-xl bg-slate-800 text-xs font-black text-slate-200 disabled:opacity-50" @click="closeDisable">Отмена</button><button type="button" :disabled="updatingId === disableUser.id" class="min-h-11 rounded-xl bg-red-600 text-xs font-black text-white disabled:cursor-wait disabled:opacity-60" @click="confirmDisable">{{ updatingId === disableUser.id ? 'Отключаем…' : 'Отключить доступ' }}</button></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect.vue';
import { KeyRound, LoaderCircle, UserCheck, UserPlus, UserRound, Users, UserX, X } from 'lucide-vue-next';

interface TeamUser { id:string; name:string; email:string; role:'clinic_owner'|'clinic_admin'|'dispatcher'; status?:'INVITED'|'ACTIVE'|'DISABLED' }

const roleSelectOptions: SelectOption[] = [
  { value: 'dispatcher', label: 'Диспетчер' },
  { value: 'clinic_admin', label: 'Администратор клиники' }
];
const auth=useAuthStore();
const router=useRouter();
const users=ref<TeamUser[]>([]),showCreate=ref(false),saving=ref(false),error=ref(''),loading=ref(true),loadError=ref(''),updatingId=ref('');
const resetUser=ref<TeamUser|null>(null),resetCurrentPassword=ref(''),resetPasswordValue=ref(''),resetPasswordConfirm=ref(''),resetError=ref(''),resetSaving=ref(false),nameInput=ref<HTMLInputElement|null>(null);
const createTrigger=ref<HTMLButtonElement|null>(null),createDialog=ref<HTMLElement|null>(null),resetDialog=ref<HTMLElement|null>(null),resetPasswordInput=ref<HTMLInputElement|null>(null);
const resetCurrentInput=ref<HTMLInputElement|null>(null);
const disableUser=ref<TeamUser|null>(null),disableDialog=ref<HTMLElement|null>(null);
let returnFocusTo:HTMLElement|null=null;
const rowErrors=reactive<Record<string,string>>({});
const form=reactive({name:'',email:'',role:'dispatcher' as 'dispatcher'|'clinic_admin',password:'',passwordConfirm:''});
const roleName=(role:string)=>({clinic_owner:'Владелец',clinic_admin:'Администратор',dispatcher:'Диспетчер'}[role]||role);
const userBadge=(user:TeamUser)=>user.status==='DISABLED'?'Отключён':user.status==='INVITED'?'Приглашён':roleName(user.role);
const canReset=(user:TeamUser)=>user.role!=='clinic_owner'||user.id===auth.user?.id;
const isSelfReset=computed(()=>Boolean(resetUser.value&&resetUser.value.id===auth.user?.id));

async function load(){loading.value=true;loadError.value='';try{const res=await apiFetch('/api/clinic/users');const data=await res.json();if(!res.ok)throw new Error(data.error||'Ошибка сервера');users.value=data.map((user:TeamUser)=>({...user,status:user.status||'ACTIVE'}));}catch(err){loadError.value=err instanceof Error?err.message:'Не удалось загрузить сотрудников';}finally{loading.value=false;}}
async function openCreate(){returnFocusTo=document.activeElement as HTMLElement|null;showCreate.value=true;error.value='';await nextTick();nameInput.value?.focus();}
function restoreFocus(fallback?:HTMLElement|null){void nextTick(()=>(returnFocusTo||fallback)?.focus());}
function closeCreate(){if(!saving.value){showCreate.value=false;error.value='';Object.assign(form,{name:'',email:'',role:'dispatcher',password:'',passwordConfirm:''});restoreFocus(createTrigger.value);}}
async function createUser(){if(form.password!==form.passwordConfirm){error.value='Пароли не совпадают';return;}saving.value=true;error.value='';try{const res=await apiFetch('/api/clinic/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,email:form.email,role:form.role,password:form.password})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Не удалось создать сотрудника');users.value.push({...data,status:data.status||'ACTIVE'});Object.assign(form,{name:'',email:'',role:'dispatcher',password:'',passwordConfirm:''});showCreate.value=false;restoreFocus(createTrigger.value);}catch(err){error.value=err instanceof Error?err.message:'Не удалось создать сотрудника';}finally{saving.value=false;}}
async function requestToggleUser(user:TeamUser){if(user.status==='DISABLED'){await toggleUser(user);return;}returnFocusTo=document.activeElement as HTMLElement|null;disableUser.value=user;await nextTick();disableDialog.value?.querySelector<HTMLElement>('button')?.focus();}
function closeDisable(){if(disableUser.value&&updatingId.value===disableUser.value.id)return;disableUser.value=null;void nextTick(()=>returnFocusTo?.focus());}
async function confirmDisable(){const user=disableUser.value;if(!user)return;await toggleUser(user);disableUser.value=null;void nextTick(()=>returnFocusTo?.focus());}
async function toggleUser(user:TeamUser){const status=user.status==='DISABLED'?'ACTIVE':'DISABLED';updatingId.value=user.id;rowErrors[user.id]='';try{const res=await apiFetch(`/api/clinic/users/${encodeURIComponent(user.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Изменение отклонено');Object.assign(user,data);}catch(err){rowErrors[user.id]=err instanceof Error?err.message:'Не удалось изменить доступ';}finally{updatingId.value='';}}
async function changeRole(user:TeamUser,role:'dispatcher'|'clinic_admin'){const previous=user.role;user.role=role;updatingId.value=user.id;rowErrors[user.id]='';try{const res=await apiFetch(`/api/clinic/users/${encodeURIComponent(user.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Изменение отклонено');Object.assign(user,data);}catch(err){user.role=previous;rowErrors[user.id]=err instanceof Error?err.message:'Не удалось изменить роль';}finally{updatingId.value='';}}
function handleRoleChange(user:TeamUser,event:Event){void changeRole(user,(event.target as HTMLSelectElement).value as 'dispatcher'|'clinic_admin');}
async function openReset(user:TeamUser){returnFocusTo=document.activeElement as HTMLElement|null;resetUser.value=user;resetCurrentPassword.value='';resetPasswordValue.value='';resetPasswordConfirm.value='';resetError.value='';await nextTick();(isSelfReset.value?resetCurrentInput.value:resetPasswordInput.value)?.focus();}
function closeReset(){if(!resetSaving.value){resetUser.value=null;resetCurrentPassword.value='';resetPasswordValue.value='';resetPasswordConfirm.value='';void nextTick(()=>returnFocusTo?.focus());}}
async function resetPassword(){const user=resetUser.value;if(!user)return;if(resetPasswordValue.value!==resetPasswordConfirm.value){resetError.value='Пароли не совпадают';return;}if(isSelfReset.value&&resetCurrentPassword.value===resetPasswordValue.value){resetError.value='Новый пароль должен отличаться от текущего';return;}resetSaving.value=true;resetError.value='';try{if(isSelfReset.value){await auth.changePassword(resetCurrentPassword.value,resetPasswordValue.value);resetUser.value=null;resetCurrentPassword.value='';resetPasswordValue.value='';resetPasswordConfirm.value='';await router.replace({path:'/login',query:{passwordChanged:'1'}});return;}const res=await apiFetch(`/api/clinic/users/${encodeURIComponent(user.id)}/reset-password`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:resetPasswordValue.value})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Не удалось изменить пароль');resetUser.value=null;resetPasswordValue.value='';resetPasswordConfirm.value='';void nextTick(()=>returnFocusTo?.focus());}catch(err){resetError.value=err instanceof Error?err.message:'Не удалось изменить пароль';}finally{resetSaving.value=false;}}
function trapFocus(event:KeyboardEvent,container:HTMLElement|null){if(!container)return;const elements=Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'));if(!elements.length)return;const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
onMounted(load);
</script>
