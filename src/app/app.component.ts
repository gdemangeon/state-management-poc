import {Component, inject, Injectable} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  catchError,
  dematerialize,
  ErrorNotification,
  filter,
  first,
  map,
  materialize,
  Observable,
  startWith,
  Subject,
  switchMap,
  throwError,
  timer
} from 'rxjs';
import {createAdapter} from '@state-adapt/core';
import {adapt} from '@state-adapt/angular';
import {Source, toSource} from '@state-adapt/rxjs';

@Injectable({ providedIn: 'root' })
class ClientApiService {
  public fetchById(clientId: string) {
    // return throwError(() => 'coucou');
    return timer(1000).pipe(
      map((id) => ({ '1': 'Caro', '2': 'Gauthier' }[clientId])),
      filter(Boolean),
      first()
    );
  }
}

@Injectable({ providedIn: 'root' })
class CartApiService {
  fetch(): Observable<Cart> {
    return throwError(() => 'fetch error');
    return timer(1000).pipe(
      map(() => ({id: Math.random()}))
    )
  }

  create(): Observable<Cart> {
    return throwError(() => 'create error');
    return timer(1000).pipe(
      map(() => ({id: 1}))
    )
  }
}

type Cart = {
  id: number;
};

export type CartState = {
  cart: Cart | null;
  cartLoading: boolean;
  cartLoadedError: string | null;
};

const initialCartState: CartState = {
  cart: null,
  cartLoading: false,
  cartLoadedError: null,
};

@Injectable({ providedIn: 'root' })
class CartStore {
  readonly #cartApiService = inject(CartApiService);

  readonly #cartAdapter = createAdapter<CartState>()({
    loadCart: (state) => ({...state, cart: null, cartLoading: true, cartLoadedError: null}),
    loadCartSuccess: (state, cart: Cart) => ({...state, cart, cartLoading: false}),
    loadCartFailure: (state, cartLoadedError: string) => ({...state, cartLoading: false, cartLoadedError}),
  });

  readonly loadCart$$ = new Subject<void>();
  readonly #loadCart$: Observable<void> = this.loadCart$$.pipe(
    startWith(undefined)
  );

  readonly cartLoaded$ = this.#loadCart$.pipe(
    switchMap(() => this.#cartApiService.fetch().pipe(
      catchError(() => this.#cartApiService.create()),
      materialize()
    ))
  );

  readonly store = adapt(initialCartState, {
    adapter: this.#cartAdapter,
    sources: {
      loadCart: this.#loadCart$.pipe(
        toSource('[CART] load cart')
      ),
      loadCartSuccess: this.cartLoaded$.pipe(
        filter(({ kind }) => kind === 'N'),
        dematerialize(),
        toSource('[CART] load cart success')
      ),
      loadCartFailure: this.cartLoaded$.pipe(
        filter(({ kind }) => kind === 'E'),
        map((errorNotif) => (errorNotif as ErrorNotification).error),
        toSource('[CART] load cart failure')
      ),
    },
    path: 'cart'
  });
}

type CartState2 = {
  client: string | null;
  sousPaniers: string[] | null;
  error: string | null;
  cart: Cart | null;
};
@Injectable({ providedIn: 'root' })
class CartStore2 {
  readonly #clientApiService = inject(ClientApiService);

  readonly #cartAdapter = createAdapter<CartState2>()({
    addClient: (cartState, client: string) => ({ ...cartState, client }),
    removeClient: (cartState) => ({ ...cartState, client: null }),
    setSelectionError: (cartState, error: string | null) => ({
      ...cartState,
      error,
    }),
    selectors: {
      client: (state) => state.client,
    },
  });

  public readonly getClientById$$ = new Subject<string>();
  public readonly removeClient$$ = new Source<void>('[CART] removeClient');
  readonly removeClient = new Source<void>('[CART] removeClient');

  readonly #getClient$ = this.getClientById$$.pipe(
    switchMap((clientId) =>
      this.#clientApiService.fetchById(clientId).pipe(materialize())
    )
  );

  readonly store = adapt(
      <CartState2>{ client: null, sousPaniers: null },
    {
      adapter: this.#cartAdapter,
      sources: {
        addClient: this.#getClient$.pipe(
          filter(({ kind }) => kind === 'N'),
          dematerialize(),
          toSource('[CART] addClient')
        ),
        removeClient: this.removeClient$$,
        setSelectionError: this.#getClient$.pipe(
          filter(({ kind }) => kind !== 'C'),
          map((notif) => (notif.kind === 'E' ? notif.error : null)),
          toSource('[CART] setSelectionError')
        ),
      },
      path: 'cart'
    }
  );
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `<input #input/><button (click)="addClient(input.value!)">Add client</button><button (click)="removeClient()">Remove</button>`,
})
export class AppComponent {
  readonly #cartStore = inject(CartStore);

  constructor() {
    this.#cartStore.store.state$.subscribe(console.log);
  }

  public addClient(clientId: string) {
    // this.#cartStore.getClientById$$.next(clientId);
    // this.#cartStore.addClient(clientId);
  }

  public removeClient() {
    // this.#cartStore.removeClient$$.next();
    // this.#cartStore.addClient(clientId);
  }
}
